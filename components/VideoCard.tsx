
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GeneratedVideo } from '../types';

export const VideoCard: React.FC<{ video: GeneratedVideo }> = ({ video }) => {
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentMirrorIndex, setCurrentMirrorIndex] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * DEEP DISCOVERY MIRROR NETWORK
   * Prioritizes the original signed URL and common cluster paths.
   */
  const mirrors = useMemo(() => {
    const id = video.uuid;
    if (!id) return [];

    const clusters = [
      video.url, // Original signed URL (Most likely to be the real video)
      `https://cdn.geminigen.ai/videos/${id}.mp4`,
      `https://cdn.geminigen.ai/sora/${id}.mp4`,
      `https://uapi.geminigen.ai/storage/videos/${id}.mp4`,
      `https://api.geminigen.ai/storage/videos/${id}.mp4`,
      `https://geminigen.ai/storage/videos/${id}.mp4`
    ].filter(url => url && url.length > 10);

    const proxies = [
      (u: string) => u, // Direct attempt
      (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
    ];

    const finalSet = new Set<string>();
    clusters.forEach(clusterUrl => {
      proxies.forEach(proxyFn => {
        finalSet.add(proxyFn(clusterUrl.replace(/\\/g, '')));
      });
    });

    return Array.from(finalSet);
  }, [video.uuid, video.url]);

  const isCompleted = video.status === 2 || video.status_percentage >= 100;
  const isFailed = video.status === 3;
  const isProcessing = !isCompleted && !isFailed;

  useEffect(() => {
    if (isCompleted && mirrors.length > 0) {
      setVideoError(false);
    }
  }, [video.url, isCompleted, mirrors.length]);

  const handleVideoError = () => {
    if (currentMirrorIndex < mirrors.length - 1) {
      setCurrentMirrorIndex(prev => prev + 1);
      if (videoRef.current) {
        videoRef.current.load();
      }
    } else {
      setVideoError(true);
    }
  };

  /**
   * RECURSIVE DOWNLOADER
   * Tries every available mirror to download the file as a blob,
   * validating that the blob is actually a video and not a thumbnail.
   */
  const handleDownload = async () => {
    if (!isCompleted || isDownloading) return;
    
    setIsDownloading(true);
    let success = false;

    // Prioritize original video.url for download with corsproxy.io as it's the most reliable
    const downloadSequence = [
      `https://corsproxy.io/?${encodeURIComponent(video.url)}`,
      ...mirrors
    ];
    
    for (let i = 0; i < downloadSequence.length; i++) {
      const targetUrl = downloadSequence[i];
      if (!targetUrl) continue;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // Extended 30s for large videos

        const response = await fetch(targetUrl, { 
          signal: controller.signal,
          mode: 'cors'
        });

        if (!response.ok) throw new Error("MIRROR_REJECTED");
        
        // Check content type to ensure we aren't downloading a thumbnail or an error page
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('text/html') || contentType.includes('image/')) {
           throw new Error("NOT_A_VIDEO_CONTENT");
        }

        const blob = await response.blob();
        
        // Final sanity check: Real videos are rarely under 100KB, thumbnails often are
        if (blob.size < 100000 && !contentType.includes('video')) {
           throw new Error("BLOB_TOO_SMALL_OR_NOT_VIDEO");
        }

        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Sora_Elite_${video.uuid.substring(0, 8)}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        clearTimeout(timeoutId);
        window.URL.revokeObjectURL(blobUrl);
        success = true;
        break; 
      } catch (err) {
        console.warn(`Download attempt ${i} failed, rotating node...`, err);
        continue;
      }
    }

    if (!success) {
      // Last resort: Just open the best working URL in a new tab
      window.open(video.url || mirrors[currentMirrorIndex], '_blank');
    }
    
    setIsDownloading(false);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(video.prompt);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  return (
    <div className={`glass-panel rounded-[2.5rem] overflow-hidden group border transition-all duration-700 flex flex-col h-full ${isProcessing ? 'border-cyan-500/20 bg-cyan-500/[0.02]' : 'border-white/5 bg-slate-900/40 hover:border-cyan-500/30 shadow-2xl'}`}>
      
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {isCompleted ? (
          <video 
            ref={videoRef}
            key={`vid-${video.uuid}-${currentMirrorIndex}`} 
            className="w-full h-full object-cover" 
            controls 
            playsInline 
            muted 
            loop 
            preload="metadata"
            crossOrigin="anonymous"
            onError={handleVideoError}
            poster="https://i.ibb.co/b5N15CGf/Untitled-design-18.png"
          >
            <source src={mirrors[currentMirrorIndex]} type="video/mp4" />
          </video>
        ) : isProcessing ? (
          <div className="text-center space-y-6 w-full px-10">
             <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 border-2 border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-t-cyan-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-cyan-400 font-orbitron">
                  {video.status_percentage || 5}%
                </div>
             </div>
             <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 animate-pulse">Sora Cluster Rendering</p>
          </div>
        ) : (
          <div className="text-center p-10 opacity-30">
             <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Syncing Asset...</p>
          </div>
        )}

        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? (videoError ? 'bg-red-500' : 'bg-green-500') : 'bg-yellow-500 animate-pulse'}`}></div>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
              {isCompleted ? (videoError ? 'FAULT' : `NODE_${currentMirrorIndex + 1}/${mirrors.length}`) : 'PROCESSING'}
            </span>
          </div>
        </div>

        {videoError && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-8 text-center z-20">
             <svg className="w-8 h-8 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2}/></svg>
             <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Aset Tiada Di Rangkaian</p>
             <button onClick={() => { setVideoError(false); setCurrentMirrorIndex(0); }} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest">Muat Semula Rangkaian</button>
          </div>
        )}
      </div>

      <div className="p-7 flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-5">
          <div className="flex gap-2">
            <span className="text-[8px] font-black px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
              {video.model_name.toUpperCase()}
            </span>
            <span className="text-[8px] font-black px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/10">{video.duration}S</span>
          </div>
          <span className="text-[8px] font-mono text-slate-700">{video.aspectRatio}</span>
        </div>

        <p className="text-[11px] text-slate-400 line-clamp-2 italic mb-8 leading-relaxed font-medium">"{video.prompt}"</p>
        
        <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-white/5">
          <button 
            onClick={handleDownload} 
            disabled={!isCompleted || isDownloading}
            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all flex items-center justify-center gap-2 shadow-lg ${isCompleted ? (isDownloading ? 'bg-slate-700' : 'bg-cyan-600 hover:bg-cyan-500') : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}
          >
            {isDownloading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2.5}/></svg>
            )}
            <span>{isCompleted ? (isDownloading ? 'Downloading...' : 'Download') : 'Rendering...'}</span>
          </button>
          <div className="flex justify-between items-center px-2">
            <button onClick={copyPrompt} className="text-[8px] font-black uppercase text-slate-600 hover:text-cyan-400 transition-colors">{isCopying ? 'Copied' : 'Copy Prompt'}</button>
            <span className="text-[8px] font-mono text-slate-800 tracking-tighter">ID: {video.uuid.substring(0, 8)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
