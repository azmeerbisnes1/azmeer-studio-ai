
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GeneratedVideo } from '../types.ts';
import { getSpecificHistory, mapToGeneratedVideo } from '../services/geminigenService.ts';

export const VideoCard: React.FC<{ video: GeneratedVideo }> = ({ video: initialVideo }) => {
  const [video, setVideo] = useState(initialVideo);
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [syncNode, setSyncNode] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [isHydrating, setIsHydrating] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const isCompleted = video.status === 2 || (video.status_percentage && video.status_percentage >= 100);
  const isProcessing = video.status === 1 && !isCompleted;
  const isFailed = video.status === 3;

  useEffect(() => {
    if (isCompleted && !video.url && !isHydrating) {
      const hydrate = async () => {
        setIsHydrating(true);
        try {
          const detailedData = await getSpecificHistory(video.uuid);
          const mapped = mapToGeneratedVideo(detailedData);
          if (mapped.url) setVideo(mapped);
        } catch (e) {
          console.error("Hydration failed for", video.uuid, e);
        } finally {
          setIsHydrating(false);
        }
      };
      hydrate();
    }
  }, [isCompleted, video.url, video.uuid, isHydrating]);

  const proxyOptions = useMemo(() => [
    (u: string) => u,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ], []);

  const resolvedUrl = useMemo(() => {
    if (!video.url) return "";
    return proxyOptions[syncNode](video.url);
  }, [video.url, syncNode, proxyOptions]);

  const handleVideoError = () => {
    const nextNode = syncNode + 1;
    if (nextNode < proxyOptions.length) {
      setSyncNode(nextNode);
      setErrorCount(prev => prev + 1);
    } else {
      setErrorCount(99); 
    }
  };

  const handleDownload = async () => {
    if (!isCompleted || isDownloading || !video.url) return;
    setIsDownloading(true);
    try {
      const res = await fetch(resolvedUrl);
      const blob = await res.blob();
      const bUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = bUrl;
      link.download = `AzmeerAI_Video_${video.uuid.substring(0, 8)}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(bUrl);
    } catch (e) {
      window.open(video.url, '_blank');
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  const copyLink = () => {
    if (!video.url) return;
    navigator.clipboard.writeText(video.url);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  return (
    <div className={`glass-panel rounded-[2.5rem] overflow-hidden group border transition-all duration-700 flex flex-col h-full animate-up ${isProcessing ? 'border-cyan-500/30 bg-cyan-500/[0.03]' : isFailed ? 'border-red-500/20 bg-red-500/[0.02]' : 'border-white/5 bg-slate-900/40 hover:border-cyan-500/20 shadow-2xl'}`}>
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {isCompleted ? (
          <>
            {errorCount < 99 && video.url ? (
              <video 
                key={`${video.uuid}-${syncNode}`}
                ref={videoRef}
                src={resolvedUrl}
                className="w-full h-full object-contain" 
                controls 
                playsInline 
                muted 
                loop 
                autoPlay
                onError={handleVideoError}
                poster="https://i.ibb.co/b5N15CGf/Untitled-design-18.png"
              />
            ) : isHydrating ? (
              <div className="text-center p-8 space-y-4">
                 <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
                 <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Tengah Load Link...</p>
              </div>
            ) : (
              <div className="text-center p-8 flex flex-col items-center justify-center space-y-4">
                 <svg className="w-12 h-12 text-red-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Video Tiada Dalam Server</p>
                 {video.url && (
                    <button onClick={() => window.open(video.url, '_blank')} className="text-[8px] font-black uppercase bg-slate-800 text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">Buka Terus</button>
                 )}
              </div>
            )}
          </>
        ) : isFailed ? (
          <div className="text-center p-8 space-y-4">
             <svg className="w-10 h-10 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Gagal Dijana</p>
          </div>
        ) : (
          <div className="text-center space-y-6 w-full px-10 relative py-20 bg-slate-950/40">
             <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.02] to-transparent animate-pulse"></div>
             <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-[6px] border-slate-900 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-t-cyan-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-cyan-400 font-orbitron">
                  {video.status_percentage || 5}%
                </div>
             </div>
             <div className="space-y-1">
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 animate-pulse">Sedang Diproses...</p>
               <p className="text-[8px] text-slate-600 font-mono uppercase">ID: {video.uuid.substring(0, 6)}</p>
             </div>
          </div>
        )}
      </div>

      <div className="p-8 flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <span className="text-[8px] font-black px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">SORA 2.0</span>
            <span className="text-[8px] font-black px-3 py-1.5 rounded-lg bg-white/5 text-slate-500 border border-white/10">{video.duration}S</span>
          </div>
          <span className="text-[9px] font-mono text-slate-700 uppercase">{video.aspectRatio}</span>
        </div>

        <p className="text-[11px] text-slate-400 line-clamp-3 italic mb-10 leading-relaxed font-medium">"{video.prompt}"</p>
        
        <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-white/5">
          <button 
            onClick={handleDownload} 
            disabled={!isCompleted || isDownloading || !video.url}
            className={`w-full py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] text-white transition-all flex items-center justify-center gap-3 shadow-2xl ${isCompleted && video.url ? (isDownloading ? 'bg-slate-800' : 'bg-cyan-600 hover:bg-cyan-500 hover:scale-[1.02] active:scale-95') : 'bg-white/5 text-slate-700 cursor-not-allowed'}`}
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={3}/></svg>
            )}
            <span>{isCompleted ? (isDownloading ? 'Diproses...' : 'Download Video') : isFailed ? 'GAGAL' : 'Menunggu...'}</span>
          </button>
          <div className="flex justify-between items-center px-2 mt-4">
            <button onClick={copyLink} disabled={!video.url} className={`text-[9px] font-black uppercase tracking-widest ${video.url ? 'text-slate-600 hover:text-cyan-400 transition-colors' : 'text-slate-800 cursor-not-allowed'}`}>{isCopying ? 'Link Disalin!' : 'Copy Link'}</button>
            <span className="text-[8px] font-mono text-slate-800 tracking-tighter">{video.uuid.substring(0, 12)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
