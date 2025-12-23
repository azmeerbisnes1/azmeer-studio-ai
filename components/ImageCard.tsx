
import React, { useState } from 'react';
import { GeneratedImage } from '../types';

interface ImageCardProps {
  image: GeneratedImage;
  onAnimate?: () => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, onAnimate }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!image.url) return;
    setIsDownloading(true);
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `AzmeerAI_Img_${image.uuid.substring(0, 6)}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Gagal muat turun:", error);
      window.open(image.url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="glass-panel rounded-[2rem] overflow-hidden group border border-white/5 relative flex flex-col h-full hover:border-orange-500/40 transition-all duration-500">
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
           <span className="text-[8px] font-mono text-white opacity-80 uppercase tracking-widest">{image.uuid.substring(0, 8)}</span>
        </div>
      </div>

      <div className="relative w-full aspect-square bg-slate-950 overflow-hidden">
        {image.url ? (
          <img 
            src={image.url} 
            alt={image.prompt}
            className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-1000"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900">
             <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500 p-8 flex flex-col justify-end">
           <p className="text-[10px] text-white/60 font-mono tracking-tighter uppercase">Source: {image.style || 'Imagen Pro'}</p>
        </div>
      </div>

      <div className="p-6 sm:p-8 flex-grow flex flex-col">
        <div className="flex items-center gap-3 mb-4">
           <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border text-orange-400 border-orange-500/30 bg-orange-500/5">
             ARKIB_IMEJ
           </span>
           <span className="text-[8px] font-mono text-slate-600">{image.aspectRatio}</span>
        </div>
        
        <p className="text-xs text-slate-400 line-clamp-2 italic leading-relaxed font-medium mb-6 flex-grow">
          "{image.prompt}"
        </p>

        <div className="flex flex-col gap-2 pt-6 border-t border-white/5 mt-auto">
          {onAnimate && image.url && (
            <button 
              onClick={onAnimate}
              className="w-full flex items-center justify-center gap-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 py-3 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest text-purple-400"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" strokeWidth={2} /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2} /></svg>
              <span>Animate with Sora 2</span>
            </button>
          )}
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest text-slate-300 disabled:opacity-50"
          >
            {isDownloading ? (
              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2} /></svg>
            )}
            <span>{isDownloading ? 'Downloading...' : 'Download JPG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
