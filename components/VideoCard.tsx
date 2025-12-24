
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedVideo } from '../types.ts';

export const VideoCard: React.FC<{ video: GeneratedVideo }> = ({ video }) => {
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [useProxySource, setUseProxySource] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const status = Number(video.status);
  const isCompleted = status === 2;
  const isProcessing = status === 1;
  const isFailed = status === 3;

  useEffect(() => {
    if (isCompleted && video.url) {
      // If direct access failed previously, or as primary for robustness, we can try proxy
      // For now, let's try direct first, then switch on error
      if (useProxySource) {
        setVideoSrc(`https://corsproxy.io/?${encodeURIComponent(video.url)}`);
      } else {
        setVideoSrc(video.url);
      }
      setVideoError(false);
    } else {
      setVideoSrc(null);
    }
  }, [isCompleted, video.url, useProxySource]);

  const handleDownload = async () => {
    if (!isCompleted || isDownloading || !video.url) return;
    setIsDownloading(true);
    
    try {
      // Attempt to download using Blob + Proxy to bypass CORS and force filename
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(video.url)}`;
      const res = await fetch(proxyUrl);
      
      if (!res.ok) throw new Error("Proxy download failed");
      
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Sora_Azmeer_${video.uuid.substring(0, 8)}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn("Direct proxy download failed, falling back to window.open", e);
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

  const handleMouseEnter = () => {
    if (videoRef.current && isCompleted && !videoError) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Playback inhibited or failed
        });
      }
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current && isCompleted) {
      videoRef.current.pause();
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    if (!videoRef.current || !isCompleted || videoError) return;
    // Don't toggle if clicking specific action buttons
    if ((e.target as HTMLElement).closest('button')) return;

    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const onVideoError = () => {
    console.warn("Video failed to load for UUID:", video.uuid);
    if (!useProxySource) {
      console.info("Switching to Proxy source for video stream...");
      setUseProxySource(true);
    } else {
      setVideoError(true);
    }
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={togglePlay}
      className={`glass-panel rounded-[2.5rem] overflow-hidden group border transition-all duration-700 flex flex-col h-full animate-up cursor-pointer ${isProcessing ? 'border-cyan-500/30 bg-cyan-500/[0.03]' : isFailed || videoError ? 'border-red-500/20 bg-red-500/[0.02]' : 'border-white/5 bg-slate-900/40 hover:border-cyan-500/20 shadow-2xl'}`}
    >
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {isCompleted && videoSrc && !videoError ? (
          <video 
            key={videoSrc} // Force re-mount on source change
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain" 
            playsInline 
            muted 
            loop 
            poster={video.thumbnail}
            onError={onVideoError}
          />
        ) : isFailed || videoError ? (
          <div className="text-center p-8 space-y-4">
             <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
               <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">
               {videoError ? 'Visual Stream Unavailable' : 'Neural Link Broken'}
             </p>
             {videoError && (
               <button 
                 onClick={(e) => { e.stopPropagation(); setVideoError(false); setUseProxySource(true); }}
                 className="text-[8px] text-slate-500 hover:text-white uppercase tracking-widest underline decoration-dashed"
               >
                 Retry Connection
               </button>
             )}
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
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-400 animate-pulse">Encoding Video...</p>
                <p className="text-[7px] font-bold uppercase text-slate-600 tracking-widest">Sora 2.0 Engine</p>
             </div>
          </div>
        )}

        {isCompleted && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
             <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
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
          <span className="text-[9px] font-mono text-slate-700 tracking-tighter uppercase">{video.uuid.substring(0, 8)}</span>
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 italic mb-10 leading-relaxed font-medium">"{video.prompt}"</p>
        
        <div className="mt-auto pt-6 border-t border-white/5 space-y-3" onClick={(e) => e.stopPropagation()}>
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
          
          <div className="flex gap-2">
            <button 
              onClick={copyLink} 
              disabled={!video.url} 
              className="flex-1 text-[9px] font-black uppercase text-slate-600 hover:text-white transition-all tracking-[0.2em] py-2 border border-white/5 rounded-xl hover:bg-white/5"
            >
              {isCopying ? 'COPIED!' : 'COPY LINK'}
            </button>
            <button 
              onClick={() => window.open(video.url, '_blank')}
              disabled={!video.url}
              className="px-4 text-[9px] font-black uppercase text-slate-600 hover:text-cyan-400 transition-all tracking-[0.2em] py-2 border border-white/5 rounded-xl hover:bg-white/5"
            >
              SOURCE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
