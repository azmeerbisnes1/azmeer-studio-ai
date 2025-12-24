
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSpecificHistory, mapToGeneratedVideo } from '../services/geminigenService.ts';
import { db } from '../services/supabaseService.ts';
import { GeneratedVideo, User, AppView } from '../types.ts';
import { VideoCard } from './VideoCard.tsx';

interface HistoryViewProps {
  user: User;
  onViewChange?: (view: AppView) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ user, onViewChange }) => {
  const [history, setHistory] = useState<GeneratedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingTimerRef = useRef<number | null>(null);

  const fetchHistory = useCallback(async (showLoading = true) => {
    if (!user || !user.username) {
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      // 1. Ambil UUID dari database Supabase
      const userUuids = await db.getUuids(user.username);
      console.log(`[Vault] Found ${userUuids.length} entries for ${user.username}`);
      
      if (!userUuids || userUuids.length === 0) {
        setHistory([]);
        setLoading(false);
        return;
      }

      // 2. Sync Real-time dengan server API
      const videoDataPromises = userUuids.map(uuid => 
        getSpecificHistory(uuid).catch(err => {
          console.warn(`[Sync Warning] UUID ${uuid}:`, err.message);
          return null;
        })
      );
      
      const rawResults = await Promise.all(videoDataPromises);
      
      const videoItems = rawResults
        .filter(item => {
          // Kita terima item jika ada uuid di mana-mana lapisan (top level atau dalam .data)
          const data = item?.data || item;
          return data && (data.uuid || data.id);
        })
        .map(item => mapToGeneratedVideo(item))
        .sort((a, b) => b.timestamp - a.timestamp);
          
      setHistory(videoItems);

      // 3. Polling Logic - jika ada video masih 'Processing'
      const hasActiveTasks = videoItems.some(v => Number(v.status) === 1);
      
      if (pollingTimerRef.current) {
        window.clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }

      if (hasActiveTasks) {
        pollingTimerRef.current = window.setTimeout(() => fetchHistory(false), 5000);
      }
    } catch (err: any) {
      console.error("[Vault Critical Error]:", err);
      setError("Ralat semasa menarik arkib. Pastikan Supabase anda telah di-setup.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory(true);
    return () => { 
      if (pollingTimerRef.current) window.clearTimeout(pollingTimerRef.current); 
    };
  }, [fetchHistory]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#020617] p-6 md:p-12 overflow-y-auto custom-scrollbar animate-up">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_12px_cyan]"></div>
              <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.5em]">Neural Cinema Vault</p>
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
              Arkib <span className="text-slate-900 stroke-text">Sora 2</span>
            </h2>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => fetchHistory(true)} 
              disabled={loading} 
              className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3 shadow-xl disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'SYNCING...' : 'RE-SYNC VAULT'}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-10 p-8 bg-red-500/10 border border-red-500/20 rounded-3xl text-center flex flex-col items-center gap-4">
             <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2}/></svg>
             <p className="text-red-400 text-xs font-black uppercase tracking-widest">{error}</p>
          </div>
        )}

        {history.length === 0 && !loading ? (
          <div className="py-32 flex flex-col items-center text-center border-4 border-dashed border-slate-900/50 rounded-[4rem] bg-slate-900/5">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-8 border border-white/5">
               <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" strokeWidth={1}/></svg>
            </div>
            <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-xs mb-8">Arkib anda masih kosong.</p>
            {onViewChange && (
              <button 
                onClick={() => onViewChange(AppView.SORA_STUDIO)}
                className="px-10 py-5 bg-cyan-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-2xl shadow-cyan-900/40"
              >
                Mula Bina Video Sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-40">
            {history.map((video) => (
              <VideoCard key={video.uuid} video={video} />
            ))}
          </div>
        )}
      </div>
      <style>{`
        .stroke-text { -webkit-text-stroke: 1px rgba(255,255,255,0.05); color: transparent; }
      `}</style>
    </div>
  );
};

export default HistoryView;
