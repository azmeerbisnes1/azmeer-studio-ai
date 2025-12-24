import React, { useState, useRef, useEffect } from 'react';
import { GeneratedVideo } from '../types.ts';

export const VideoCard: React.FC<{ video: GeneratedVideo }> = ({ video }) => {
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [internalSrc, setInternalSrc] = useState<string | null>(null);
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const status = Number(video.status);
  const isCompleted = status === 2;
  const isProcessing = status === 1;
  const isFailed = status === 3;

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (internalSrc && internalSrc.startsWith('blob:')) {
        URL.revokeObjectURL(internalSrc);
      }
    };
  }, [internalSrc]);

  /**
   * Bypasses 'application/octet-stream' by fetching the file via proxy 
   * and creating a local video/mp4 blob. Essential for Cloudflare R2 links 
   * that otherwise trigger a browser download action.
   */
  const fetchNeuralBlob = async () => {
    if (!isCompleted || !video.url || isLoadingBlob) return null;
    
    setIsLoadingBlob(true);
    setVideoError(false);
    
    try {
      // Use a proxy to bypass CORS and ensure we can read the binary data
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(video.url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Neural link failed to establish.");
      
      const blob = await response.blob();
      // Force video/mp4 MIME type on the blob so the browser handles it as a streamable video
      const videoBlob = new Blob([blob], { type: 'video/mp4' });
      const blobUrl = URL.createObjectURL(videoBlob);
      
      setInternalSrc(blobUrl);
      setIsLoadingBlob(false);
      return blobUrl;
    } catch (err) {
      console.error("Neural Sync Failed:", err);
      setVideoError(true);
      setIsLoadingBlob(false);
      return null;
    }
  };

  const handleVideoError = () => {
    console.warn("Direct stream restricted by server headers. Attempting Neural Blob recovery...");
    if (!isLoadingBlob && !internalSrc) {
      fetchNeuralBlob();
    } else {
      setVideoError(true);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted || !video.url || isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      // Always fetch via proxy for download to bypass headers that force 'save as' 
      // or block cross-origin requests, ensuring the 'download' attribute works.
      let downloadUrl = internalSrc && internalSrc.startsWith('blob:') ? internalSrc : null;
      
      if (!downloadUrl) {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(video.url)}`;
        const res = await fetch(proxyUrl);
        const blob = await res.blob();
        downloadUrl = URL.createObjectURL(blob);
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Sora_Azmeer_Studio_${video.uuid.substring(0, 8)}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the temporary blob if it's not the one used for the player
      if (downloadUrl !== internalSrc) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl!), 1000);
      }
    } catch (err) {
      console.error("Direct download handshake failed:", err);
      // Fallback for extreme cases
      window.open(video.url, '_blank');
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted || videoError) return;

    if (!internalSrc && !isLoadingBlob) {
      await fetchNeuralBlob();
    }

    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(handleVideoError);
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleMouseEnter = async () => {
    if (isCompleted && !videoError) {
      if (!internalSrc && !isLoadingBlob) {
        // Pre-fetch blob on hover for smoother experience
        fetchNeuralBlob();
      }
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(handleVideoError);
      }
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current && isCompleted) {
      videoRef.current.pause();
    }
  };

  const copyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(video.url);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={togglePlay}
      className={`glass-panel rounded-[2.5rem] overflow-hidden group border transition-all duration-700 flex flex-col h-full animate-up cursor-pointer relative ${
        isProcessing ? 'border-cyan-500/30 bg-cyan-500/[0.03]' : 
        isFailed || videoError ? 'border-red-500/20 bg-red-500/[0.02]' : 
        'border-white/5 bg-slate-900/40 hover:border-cyan-500/20 shadow-2xl hover:scale-[1.02]'
      }`}
    >
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {isCompleted && !videoError ? (
          <>
            {internalSrc ? (
              <video 
                ref={videoRef}
                key={internalSrc}
                className={`w-full h-full object-contain transition-opacity duration-700 ${isLoadingBlob ? 'opacity-40' : 'opacity-100'}`} 
                playsInline 
                muted 
                loop 
                poster={video.thumbnail}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={handleVideoError}
              >
                <source src={internalSrc} type="video/mp4" />
              </video>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <img src={video.thumbnail} className="w-full h-full object-cover opacity-30 blur-md absolute inset-0" alt="" />
                 {isLoadingBlob ? (
                    <div className="relative z-10 flex flex-col items-center gap-4">
                       <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                       <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Neural Sync In Progress...</p>
                    </div>
                 ) : (
                    <div className="relative z-10 w-16 h-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 group-hover:scale-110 transition-transform">
                       <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                 )}
              </div>
            )}
          </>
        ) : isFailed || videoError ? (
          <div className="text-center p-8 space-y-6">
             <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
               <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <div className="space-y-2">
                <p className="text-[11px] font-black text-red-500 uppercase tracking-widest">Neural Link Distorted</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); fetchNeuralBlob(); }}
                  className="text-[9px] text-slate-500 hover:text-white uppercase tracking-[0.2em] underline decoration-dashed transition-all"
                >
                  Attempt Neural Reroute
                </button>
             </div>
          </div>
        ) : (
          <div className="text-center space-y-8 w-full px-12 py-20 bg-slate-950/40">
             <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-slate-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-cyan-400 font-orbitron">
                  {video.status_percentage}%
                </div>
             </div>
             <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-400 animate-pulse">Encoding Neural Fabric...</p>
                <p className="text-[8px] font-bold uppercase text-slate-600 tracking-[0.3em]">Sora 2.0 Engine Matrix</p>
             </div>
          </div>
        )}

        {isCompleted && !videoError && !isPlaying && !isLoadingBlob && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/50 transition-all pointer-events-none">
             <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl transition-all group-hover:scale-110">
                <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
             </div>
          </div>
        )}
      </div>

      <div className="p-8 md:p-10 flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-3">
            <span className="text-[9px] font-black px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest shadow-lg shadow-cyan-900/10">SORA 2 ELITE</span>
            <span className="text-[9px] font-black px-3 py-1.5 rounded-lg bg-white/5 text-slate-500 border border-white/5 uppercase tracking-widest">{video.duration} SEC</span>
          </div>
          <span className="text-[10px] font-mono text-slate-700 tracking-tighter uppercase font-bold">NODE_{video.uuid.substring(0, 8)}</span>
        </div>

        <p className="text-[13px] text-slate-400 line-clamp-2 italic mb-10 leading-relaxed font-medium">
          "{video.prompt}"
        </p>
        
        <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
          <button 
            onClick={handleDownload} 
            disabled={!isCompleted || isDownloading || !video.url}
            className={`w-full py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all flex items-center justify-center gap-3 shadow-2xl ${isCompleted ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950/40 active:scale-95' : 'bg-white/5 text-slate-700 cursor-not-allowed'}`}
          >
            {isDownloading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2.5}/></svg>
            )}
            <span>{isDownloading ? 'EXTRACTING MP4...' : 'DIRECT DOWNLOAD'}</span>
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={copyUrl} 
              disabled={!video.url} 
              className="flex-1 text-[10px] font-black uppercase text-slate-600 hover:text-white transition-all tracking-[0.2em] py-3 border border-white/5 rounded-2xl hover:bg-white/5 bg-slate-900/40"
            >
              {isCopying ? 'COPIED TO CLIPBOARD' : 'COPY NEURAL LINK'}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); window.open(video.url, '_blank'); }}
              disabled={!video.url}
              className="px-6 text-[10px] font-black uppercase text-slate-600 hover:text-cyan-400 transition-all tracking-[0.2em] py-3 border border-white/5 rounded-2xl hover:bg-white/5 bg-slate-900/40"
              title="Open Source"
            >
              RAW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};