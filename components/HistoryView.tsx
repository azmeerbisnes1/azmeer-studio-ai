
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
  const [logs, setLogs] = useState<string[]>([]);
  const pollingTimerRef = useRef<number | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 5));
  };

  const fetchHistory = useCallback(async (showLoading = true) => {
    if (!user?.username) return;
    if (showLoading) setLoading(true);
    
    try {
      addLog("Mengambil ID video dari pangkalan data...");
      const userUuids = await db.getUuids(user.username);
      
      if (!userUuids || userUuids.length === 0) {
        addLog("Tiada ID ditemui untuk pengguna ini.");
        setHistory([]);
        setLoading(false);
        return;
      }

      addLog(`Menyemak status ${userUuids.length} video pada server...`);
      
      // Ambil data satu persatu untuk elakkan rate limit
      const videoItems: GeneratedVideo[] = [];
      for (const uuid of userUuids) {
        try {
          const raw = await getSpecificHistory(uuid);
          videoItems.push(mapToGeneratedVideo(raw));
        } catch (e) {
          console.error(`Gagal sync UUID: ${uuid}`);
        }
      }
      
      const sortedItems = videoItems.sort((a, b) => b.timestamp - a.timestamp);
      setHistory(sortedItems);
      addLog("Senarai video berjaya dikemas kini.");

      // Teruskan polling jika ada video yang masih processing (status 1)
      const hasActiveTasks = videoItems.some(v => Number(v.status) === 1);
      if (pollingTimerRef.current) window.clearTimeout(pollingTimerRef.current);
      if (hasActiveTasks) {
        pollingTimerRef.current = window.setTimeout(() => fetchHistory(false), 5000);
      }
    } catch (err: any) {
      addLog(`Ralat: ${err.message}`);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory(true);
    return () => { if (pollingTimerRef.current) window.clearTimeout(pollingTimerRef.current); };
  }, [fetchHistory]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#020617] p-6 md:p-12 overflow-y-auto custom-scrollbar animate-up">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_12px_cyan]"></div>
              <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.5em]">Neural Archive Node v12.1</p>
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
              Arkib <span className="text-slate-900 stroke-text">Sora</span>
            </h2>
          </div>
          
          <button 
            onClick={() => fetchHistory(true)} 
            disabled={loading}
            className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            SYNC MANUAL
          </button>
        </header>

        {/* Diagnostic Console */}
        <div className="mb-10 p-5 bg-black/40 border border-white/5 rounded-2xl font-mono">
          <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">System Synchronizer Log</span>
          </div>
          <div className="space-y-1">
            {logs.map((log, i) => (
              <p key={i} className="text-[9px] text-slate-500 leading-relaxed truncate">{log}</p>
            ))}
          </div>
        </div>

        {history.length === 0 && !loading ? (
          <div className="py-32 flex flex-col items-center text-center border-4 border-dashed border-slate-900/50 rounded-[4rem] bg-slate-900/5">
            <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-xs mb-8">Tiada Rekod Ditemui.</p>
            <button onClick={() => onViewChange && onViewChange(AppView.SORA_STUDIO)} className="px-12 py-5 bg-cyan-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-cyan-900/40">Mula Jana Video</button>
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
