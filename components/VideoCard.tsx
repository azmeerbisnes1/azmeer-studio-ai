
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GeneratedVideo } from '../types';
import { PROXY_NODES } from '../services/geminigenService';

export const VideoCard: React.FC<{ video: GeneratedVideo }> = ({ video }) => {
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentMirrorIndex, setCurrentMirrorIndex] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Bina pautan mirror yang lebih stabil
  const mirrors = useMemo(() => {
    const id = video.uuid;
    const cleanUrl = String(video.url).replace(/\\/g, '').replace(/["']/g, '').trim();
    const baseCdn = `https://cdn.geminigen.ai`;

    // Folder carian CDN
    const basePaths = [
      cleanUrl,
      `${baseCdn}/videos/${id}.mp4`,
      `${baseCdn}/video-gen/${id}.mp4`,
      `${baseCdn}/sora-2/${id}.mp4`,
      `${baseCdn}/sora/${id}.mp4`
    ];

    // Gunakan proxy untuk setiap laluan bagi memaksimumkan kadar kejayaan pemuatan
    const finalLinks = basePaths.flatMap(p => [
      p,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(p)}`,
      `https://corsproxy.io/?${encodeURIComponent(p)}`
    ]);

    return Array.from(new Set(finalLinks)).filter(l => l && l.length > 15);
  }, [video.uuid, video.url]);

  const isCompleted = video.status === 2 || (video.url && video.url.length > 25);
  const isFailed = video.status === 3;
  const isProcessing = !isCompleted && !isFailed;

  // Fungsi untuk memuat turun video sebagai blob jika semua mirror gagal
  const loadViaBlob = async () => {
    const target = mirrors[0] || video.url;
    try {
      const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`);
      if (!response.ok) throw new Error("Blob fetch failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setVideoError(false);
    } catch (e) {
      setVideoError(true);
    }
  };

  const handleVideoError = () => {
    const nextIndex = currentMirrorIndex + 1;
    if (nextIndex < mirrors.length) {
      setCurrentMirrorIndex(nextIndex);
    } else if (!blobUrl) {
      // Jika semua mirror gagal, cuba kaedah Blob
      loadViaBlob();
    } else {
      setVideoError(true);
    }
  };

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  useEffect(() => {
    setCurrentMirrorIndex(0);
    setVideoError(false);
    setBlobUrl(null);
  }, [video.uuid]);

  useEffect(() => {
    if (videoRef.current && isCompleted) {
      videoRef.current.load();
    }
  }, [currentMirrorIndex, blobUrl, isCompleted]);

  const handleDownload = async () => {
    if (!isCompleted || isDownloading) return;
    setIsDownloading(true);
    const targetUrl = blobUrl || mirrors[currentMirrorIndex] || video.url;

    try {
      if (blobUrl) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `AzmeerAI_${video.uuid.substring(0, 8)}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `AzmeerAI_${video.uuid.substring(0, 8)}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      window.open(targetUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(video.prompt);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  return (
    <div className={`glass-panel rounded-[2.5rem] overflow-hidden group border transition-all duration-700 flex flex-col h-full ${isProcessing ? 'border-cyan-500/20 bg-cyan-500/[0.02]' : 'border-white/5 bg-slate-900/40 hover:border-cyan-500/30 shadow-2xl'}`}>
      <div className="relative aspect-[9/16] sm:aspect-video bg-black flex items-center justify-center overflow-hidden">
        {isCompleted ? (
          <video 
            key={`vplayer-${video.uuid}-${currentMirrorIndex}-${!!blobUrl}`}
            ref={videoRef}
            src={blobUrl || mirrors[currentMirrorIndex]}
            className="w-full h-full object-contain" 
            controls 
            playsInline 
            webkit-playsinline="true"
            muted 
            loop 
            preload="metadata"
            onError={handleVideoError}
            poster="https://i.ibb.co/b5N15CGf/Untitled-design-18.png"
          />
        ) : isProcessing ? (
          <div className="text-center space-y-6 w-full px-10">
             <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 border-2 border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-t-cyan-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-cyan-400 font-orbitron">
                  {video.status_percentage || 5}%
                </div>
             </div>
             <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 animate-pulse">Rendering Video...</p>
          </div>
        ) : (
          <div className="text-center p-10 opacity-30">
             <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
               {isFailed ? 'Generation Aborted' : 'Syncing Neural Link...'}
             </p>
          </div>
        )}

        {videoError && isCompleted && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-8 text-center z-20 animate-in fade-in">
             <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4 border border-red-500/20 shadow-lg shadow-red-500/10">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2.5}/></svg>
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 leading-relaxed px-4">Maaf, semua pautan CDN disekat oleh pelayar anda atau fail telah tamat tempoh.</p>
             <div className="flex gap-2">
               <button onClick={() => window.location.reload()} className="bg-slate-800 text-white px-5 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-700">Refresh Page</button>
               <button onClick={() => window.open(video.url, '_blank')} className="bg-cyan-600 text-white px-5 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-cyan-500 shadow-lg shadow-cyan-900/20">Buka Manual</button>
             </div>
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
          <span className="text-[8px] font-mono text-slate-700 uppercase tracking-tighter">{video.aspectRatio}</span>
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
            <span>{isCompleted ? (isDownloading ? 'Downloading...' : 'Download MP4') : 'Processing...'}</span>
          </button>
          <div className="flex justify-between items-center px-2">
            <button onClick={copyPrompt} className="text-[8px] font-black uppercase text-slate-600 hover:text-cyan-400 transition-colors">{isCopying ? 'Berjaya Disalin' : 'Salin Prompt'}</button>
            <span className="text-[8px] font-mono text-slate-800 tracking-tighter">ID: {video.uuid.substring(0, 8)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
