
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllHistory, mapToGeneratedVideo } from '../services/geminigenService.ts';
import { GeneratedVideo } from '../types.ts';
import { VideoCard } from './VideoCard.tsx';

const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<GeneratedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingTimerRef = useRef<number | null>(null);

  const fetchHistory = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await getAllHistory(1, 50);
      const items = response?.result || response?.data || (Array.isArray(response) ? response : []);
      
      if (Array.isArray(items)) {
        let videoItems = items
          .filter((item: any) => item && typeof item === 'object')
          .map(mapToGeneratedVideo);
          
        setHistory(videoItems);

        const isStillRendering = videoItems.some(v => v.status === 1);
        
        if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
        if (isStillRendering) {
          pollingTimerRef.current = window.setTimeout(() => fetchHistory(false), 8000);
        }
      } else {
        setHistory([]);
      }
    } catch (err: any) {
      console.error("Vault Sync Error:", err);
      setError(err.message || "Gagal menyelaraskan koleksi video anda.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(true);
    return () => { if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current); };
  }, [fetchHistory]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#020617] p-6 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-20 flex flex-col lg:flex-row lg:items-end justify-between gap-10 pt-10 animate-up">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.8)]"></div>
              <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.6em]">Arkib Video Peribadi</p>
            </div>
            <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">
              Koleksi <span className="text-slate-900 stroke-text">Video</span>
            </h2>
          </div>
          <button 
            onClick={() => fetchHistory(true)} 
            disabled={loading} 
            className="group px-10 py-5 rounded-[2.5rem] bg-white text-slate-950 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-cyan-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 shadow-2xl disabled:opacity-50"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'MENYELARAS...' : 'KEMASKINI SENARAI'}
          </button>
        </header>

        {error && (
          <div className="bg-red-500/5 border-2 border-red-500/20 p-10 rounded-[3rem] mb-16 flex flex-col gap-6 animate-up">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               </div>
               <p className="text-red-500 text-xs font-black uppercase tracking-[0.3em]">Ralat Rangkaian Dikesan</p>
            </div>
            <p className="text-red-400/60 text-[11px] font-mono leading-relaxed bg-black/40 p-6 rounded-2xl border border-red-500/10">
              {error}
            </p>
            <button onClick={() => fetchHistory(true)} className="w-fit px-8 py-3 bg-red-600/20 hover:bg-red-600 text-white text-[10px] font-black uppercase rounded-xl transition-all">Cuba Lagi</button>
          </div>
        )}

        {history.length === 0 && !loading && !error ? (
          <div className="text-center py-48 border-4 border-dashed border-slate-900/50 rounded-[4rem] bg-slate-900/5 animate-up">
            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-8">
               <svg className="w-10 h-10 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-slate-700 font-black uppercase tracking-[0.5em] text-xs">Belum ada video lagi kat sini.</p>
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
        .stroke-text {
          -webkit-text-stroke: 1px rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
};

export default HistoryView;
