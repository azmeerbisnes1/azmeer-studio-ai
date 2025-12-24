
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedVideo } from '../types.ts';
import { fetchVideoAsBlob } from '../services/geminigenService.ts';

export const VideoCard: React.FC<{ video: GeneratedVideo }> = ({ video }) => {
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [internalSrc, setInternalSrc] = useState<string | null>(null);
  const [isLoadingNeural, setIsLoadingNeural] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const status = Number(video.status);
  const isCompleted = status === 2;
  const isProcessing = status === 1;
  const isFailed = status === 3;

  useEffect(() => {
    return () => {
      if (internalSrc && internalSrc.startsWith('blob:')) {
        URL.revokeObjectURL(internalSrc);
      }
    };
  }, [internalSrc]);

  const establishNeuralLink = async () => {
    if (!isCompleted || !video.url || isLoadingNeural || internalSrc) return null;
    
    setIsLoadingNeural(true);
    setVideoError(false);
    
    try {
      const blobUrl = await fetchVideoAsBlob(video.url);
      if (blobUrl && blobUrl.startsWith('blob:')) {
        setInternalSrc(blobUrl);
        setIsLoadingNeural(false);
        return blobUrl;
      } else {
        setInternalSrc(video.url);
        setIsLoadingNeural(false);
        return video.url;
      }
    } catch (err) {
      console.error("Neural Link Sync Failed:", err);
      setVideoError(true);
      setIsLoadingNeural(false);
      return null;
    }
  };

  useEffect(() => {
    if (!isCompleted || internalSrc || isLoadingNeural) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          establishNeuralLink();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isCompleted, internalSrc, video.url]);

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted || isFailed) return;

    let src = internalSrc;
    if (!src && !isLoadingNeural) {
      src = await establishNeuralLink();
    }

    if (videoRef.current && src) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => setVideoError(true));
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleMouseEnter = () => {
    if (!isCompleted || videoError) return;
    if (videoRef.current && internalSrc) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current && isCompleted && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted || !video.url || isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      let downloadUrl = internalSrc && internalSrc.startsWith('blob:') ? internalSrc : null;
      if (!downloadUrl) {
        downloadUrl = await fetchVideoAsBlob(video.url);
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Sora_Studio_${video.uuid.substring(0, 8)}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (downloadUrl !== internalSrc) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl!), 1000);
      }
    } catch (err) {
      console.error("Download failed:", err);
      window.open(video.url, '_blank');
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
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
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={togglePlay}
      className={`glass-panel rounded-[2.5rem] overflow-hidden group border transition-all duration-700 flex flex-col h-full animate-up cursor-pointer relative ${
        isProcessing ? 'border-cyan-500/30 bg-cyan-500/[0.03]' : 
        isFailed || videoError ? 'border-red-500/20 bg-red-500/[0.02]' : 
        'border-white/5 bg-slate-900/40 hover:border-cyan-500/20 shadow-2xl hover:scale-[1.01]'
      }`}
    >
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {isCompleted && !videoError ? (
          <>
            <video 
              ref={videoRef}
              key={internalSrc || 'fallback'}
              src={internalSrc || undefined}
              className={`w-full h-full object-contain transition-opacity duration-700 ${isLoadingNeural ? 'opacity-30' : 'opacity-100'}`} 
              playsInline 
              muted={!isPlaying} 
              loop 
              poster={video.thumbnail}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => !isLoadingNeural && establishNeuralLink()}
            />
            
            {!internalSrc && !isLoadingNeural && (
              <img src={video.thumbnail} alt="Poster" className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-500" />
            )}

            {isLoadingNeural && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
                 <div className="relative w-10 h-10 mb-4">
                    <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-t-cyan-500 rounded-full animate-spin"></div>
                 </div>
                 <p className="text-[8px] font-black text-cyan-400 uppercase tracking-[0.4em] animate-pulse">Neural Syncing...</p>
              </div>
            )}
            
            {isCompleted && !videoError && !isPlaying && !isLoadingNeural && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/30 transition-all pointer-events-none">
                 <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl transition-all group-hover:scale-110 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/30">
                    <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                 </div>
              </div>
            )}
          </>
        ) : isFailed || videoError ? (
          <div className="text-center p-8 space-y-4">
             <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
               <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Neural Link Distorted</p>
             <button 
               onClick={(e) => { e.stopPropagation(); establishNeuralLink(); }}
               className="text-[8px] text-slate-500 hover:text-white uppercase tracking-widest underline decoration-dashed transition-all"
             >
               Force Re-Sync
             </button>
          </div>
        ) : (
          <div className="text-center space-y-8 w-full px-12 py-20 bg-slate-950/40">
             <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-slate-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-cyan-400 font-orbitron">
                  {video.status_percentage || 0}%
                </div>
             </div>
             <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-cyan-400 animate-pulse">Encoding Visual Fabric...</p>
                <p className="text-[8px] font-bold uppercase text-slate-600 tracking-widest">Cinema Engine Sora 2.0</p>
             </div>
          </div>
        )}
      </div>

      <div className="p-8 flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <span className="text-[8px] font-black px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">SORA 2</span>
            <span className="text-[8px] font-black px-2.5 py-1 rounded-lg bg-white/5 text-slate-500 border border-white/5 uppercase tracking-widest">{video.duration}S</span>
          </div>
          <span className="text-[9px] font-mono text-slate-700 tracking-tighter uppercase font-bold">NODE_{video.uuid.substring(0, 8)}</span>
        </div>

        <p className="text-[12px] text-slate-300 line-clamp-2 italic mb-8 leading-relaxed font-medium">
          "{video.prompt}"
        </p>
        
        <div className="mt-auto pt-6 border-t border-white/5 space-y-3">
          <button 
            onClick={handleDownload} 
            disabled={!isCompleted || isDownloading || !video.url}
            className={`w-full py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all flex items-center justify-center gap-2 shadow-2xl ${isCompleted ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950/40 active:scale-95' : 'bg-white/5 text-slate-700 cursor-not-allowed'}`}
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2.5}/></svg>
            )}
            <span>{isDownloading ? 'EXTRACTING...' : 'DOWNLOAD CINEMA'}</span>
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={copyUrl} 
              disabled={!video.url} 
              className="flex-1 text-[9px] font-black uppercase text-slate-600 hover:text-white transition-all tracking-[0.2em] py-2.5 border border-white/5 rounded-xl hover:bg-white/5"
            >
              {isCopying ? 'LINK COPIED' : 'COPY NEURAL'}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); if (video.url) window.open(video.url, '_blank'); }}
              disabled={!video.url}
              className="px-4 text-[9px] font-black uppercase text-slate-600 hover:text-cyan-400 transition-all tracking-[0.2em] py-2.5 border border-white/5 rounded-xl hover:bg-white/5"
              title="View Raw Source"
            >
              RAW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
