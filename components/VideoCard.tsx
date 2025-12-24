
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedVideo } from '../types.ts';

export const VideoCard: React.FC<{ video: GeneratedVideo }> = ({ video }) => {
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const status = Number(video.status);
  const isCompleted = status === 2;
  const isProcessing = status === 1;
  const isFailed = status === 3;

  useEffect(() => {
    // Set video src only when completed and URL exists
    if (isCompleted && video.url) {
      setVideoSrc(video.url);
    } else {
      setVideoSrc(null);
    }
  }, [isCompleted, video.url]);

  const handleDownload = async () => {
    if (!isCompleted || isDownloading || !video.url) return;
    setIsDownloading(true);
    
    try {
      // First attempt: Direct fetch
      let res = await fetch(video.url);
      
      // If direct fetch fails (likely CORS), try with a proxy
      if (!res.ok) {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(video.url)}`;
        res = await fetch(proxyUrl);
      }
      
      if (!res.ok) throw new Error("CORS or network blockage");
      
      const blob = await res.blob();
      const bUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = bUrl;
      link.download = `Azmeer_Sora2_${video.uuid.substring(0, 8)}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(bUrl);
    } catch (e) {
      console.warn("Direct download failed, opening in new tab instead:", e);
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
        {isCompleted && videoSrc ? (
          <video 
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain" 
            controls 
            playsInline 
            muted 
            loop 
            poster={video.thumbnail}
          />
        ) : isFailed ? (
          <div className="text-center p-8 space-y-4">
             <svg className="w-10 h-10 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Neural Link Failed</p>
          </div>
        ) : (
          <div className="text-center space-y-6 w-full px-10 py-20 bg-slate-950/40">
             <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 border-4 border-slate-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-cyan-400 font-orbitron">
                  {video.status_percentage}%
                </div>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-400 animate-pulse">Encoding Cinema...</p>
                <p className="text-[7px] font-bold uppercase text-slate-600 tracking-widest">Sora 2.0 Pro Engine</p>
             </div>
          </div>
        )}
      </div>

      <div className="p-8 flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <span className="text-[8px] font-black px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">SORA 2</span>
            <span className="text-[8px] font-black px-2 py-1 rounded bg-white/5 text-slate-500">{video.duration}S</span>
          </div>
          <span className="text-[9px] font-mono text-slate-700 tracking-tighter uppercase">{video.uuid.substring(0, 10)}</span>
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 italic mb-10 leading-relaxed font-medium">"{video.prompt}"</p>
        
        <div className="mt-auto pt-6 border-t border-white/5 space-y-3">
          <button 
            onClick={handleDownload} 
            disabled={!isCompleted || isDownloading || !video.url}
            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 ${isCompleted ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/40' : 'bg-white/5 text-slate-700 cursor-not-allowed'}`}
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2}/></svg>
            )}
            <span>{isDownloading ? 'DOWNLOADING...' : 'DOWNLOAD VIDEO'}</span>
          </button>
          
          <button 
            onClick={copyLink} 
            disabled={!video.url} 
            className="w-full text-[9px] font-black uppercase text-slate-600 hover:text-white transition-all tracking-[0.2em] py-2"
          >
            {isCopying ? 'COPIED TO CLIPBOARD!' : 'COPY MEDIA LINK'}
          </button>
        </div>
      </div>
    </div>
  );
};
