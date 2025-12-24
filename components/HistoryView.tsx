
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllHistory, getSpecificHistory, mapToGeneratedVideo } from '../services/geminigenService.ts';
import { db } from '../services/supabaseService.ts';
import { GeneratedVideo, User } from '../types.ts';
import { VideoCard } from './VideoCard.tsx';

interface HistoryViewProps {
  user: User;
}

const HistoryView: React.FC<HistoryViewProps> = ({ user }) => {
  const [history, setHistory] = useState<GeneratedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingTimerRef = useRef<number | null>(null);

  /**
   * Primary sync function to match Geminigen.ai History.
   */
  const fetchHistory = useCallback(async (showLoading = true) => {
    if (!user || !user.username) {
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      // 1. Get user specific UUIDs from Supabase
      const userUuids = await db.getUuids(user.username);
      
      // 2. Fetch all history from Geminigen to sync metadata
      const allHistoryResponse = await getAllHistory(1, 50);
      const geminigenItems = allHistoryResponse?.result || allHistoryResponse?.data || [];
      
      // 3. Filter to only show videos that belong to this user (via Supabase UUID list)
      // and map them correctly to the UI model.
      const matchedItems = geminigenItems
        .filter((item: any) => userUuids.includes(item.uuid))
        .map((item: any) => mapToGeneratedVideo(item));

      // 4. Update local state
      setHistory(matchedItems.sort((a, b) => b.timestamp - a.timestamp));

      // 5. Check if we need to poll for updates (if any video is processing [status 1])
      const hasActiveTasks = matchedItems.some(v => v.status === 1);
      
      if (pollingTimerRef.current) {
        window.clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }

      if (hasActiveTasks) {
        // Poll every 5 seconds for real-time percentage updates
        pollingTimerRef.current = window.setTimeout(() => fetchHistory(false), 5000);
      }
    } catch (err: any) {
      console.error("Sync Error:", err);
      setError("Gagal menyelaraskan Arkib Video dengan Geminigen.ai.");
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
    <div className="flex-1 flex flex-col h-full bg-[#020617] p-6 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-6 animate-up">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.8)]"></div>
              <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.5em]">Arkib Koleksi Video</p>
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
              Vault <span className="text-slate-900 stroke-text">Sora 2.0</span>
            </h2>
          </div>
          <button 
            onClick={() => fetchHistory(true)} 
            disabled={loading} 
            className="group px-8 py-4 rounded-2xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-xl disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'SYNCING...' : 'REFRESH ARKIB'}
          </button>
        </header>

        {error && (
          <div className="mb-10 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-center animate-up">
             <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2">Sync Error</p>
             <p className="text-red-300 text-[10px]">{error}</p>
          </div>
        )}

        {history.length === 0 && !loading ? (
          <div className="text-center py-40 border-4 border-dashed border-slate-900/50 rounded-[4rem] bg-slate-900/5 animate-up">
            <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" strokeWidth={1}/></svg>
            </div>
            <p className="text-slate-700 font-black uppercase tracking-[0.5em] text-xs">Tiada rekod video ditemui dalam arkib anda.</p>
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
        .stroke-text { -webkit-text-stroke: 1px rgba(255,255,255,0.05); }
      `}</style>
    </div>
  );
};

export default HistoryView;
