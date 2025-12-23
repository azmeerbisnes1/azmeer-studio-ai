
import React from 'react';
import { GeneratedTTS } from '../types';

interface TTSCardProps {
  tts: GeneratedTTS;
}

export const TTSCard: React.FC<TTSCardProps> = ({ tts }) => {
  const isCompleted = tts.status === 2 || typeof tts.status === 'string' && tts.url;
  
  return (
    <div className="glass-panel rounded-[2rem] overflow-hidden group border border-white/5 relative flex flex-col hover:border-purple-500/40 transition-all duration-500 bg-slate-900/40">
      <div className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
           <div className="bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg">
             <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Sonic TTS</span>
           </div>
           <span className="text-[8px] font-mono text-slate-600">SONIC_{tts.uuid.substring(0, 8)}</span>
        </div>

        <p className="text-[11px] text-slate-300 font-medium line-clamp-3 italic mb-6 leading-relaxed">
          "{tts.prompt}"
        </p>

        {isCompleted ? (
          <div className="space-y-4">
            <audio src={tts.url} controls className="w-full h-8 custom-audio-player" />
            
            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest">Voice</span>
                <span className="text-[9px] text-slate-300 font-mono">{tts.voice}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest">Speed</span>
                <span className="text-[9px] text-slate-300 font-mono">{tts.speed}x</span>
              </div>
              <a href={tts.url} download className="ml-auto p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2} /></svg>
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-white/5 rounded-2xl">
             <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-2"></div>
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Processing Sonic Audio...</span>
          </div>
        )}
      </div>
      
      <style>{`
        .custom-audio-player::-webkit-media-controls-panel {
          background-color: rgba(15, 23, 42, 0.9);
        }
        .custom-audio-player::-webkit-media-controls-current-time-display,
        .custom-audio-player::-webkit-media-controls-time-remaining-display {
          color: #a855f7;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
        }
      `}</style>
    </div>
  );
};
