
import React, { useState } from 'react';
import { generateWebVideoPrompt, startVideoGen } from '../services/geminiService';
import { db } from '../services/supabaseService.ts';
import { AppView, User } from '../types.ts';

interface WebVideoViewProps {
  onViewChange: (view: AppView) => void;
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
}

const WebVideoView: React.FC<WebVideoViewProps> = ({ onViewChange, user, onUserUpdate }) => {
  const [webDesc, setWebDesc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [error, setError] = useState<string | null>(null);

  const isQuotaExhausted = user.role !== 'admin' && (user.videoLimit || 0) <= 0;

  const handleGenerate = async () => {
    if (!webDesc.trim() || isGenerating || isQuotaExhausted) return;
    
    setError(null);
    setIsGenerating(true);
    setIsRefining(true);
    
    try {
      // 1. Transform web description to cinematic prompt via Gemini
      const cinematicPrompt = await generateWebVideoPrompt(webDesc);
      setIsRefining(false);
      
      // 2. Start Sora 2.0 Generation
      const res = await startVideoGen({
        prompt: cinematicPrompt,
        duration: 15,
        ratio: aspectRatio,
      });

      const uuid = res?.uuid || res?.data?.uuid;
      if (uuid && user.username) {
        await db.saveUuid(user.username, uuid);
        if (user.role !== 'admin') {
          const updated = { ...user, videoLimit: (user.videoLimit || 0) - 1 };
          await db.updateUser(user.username, updated);
          if (onUserUpdate) onUserUpdate(updated);
        }
      }
      
      // 3. Success -> Go to History
      onViewChange(AppView.HISTORY);
    } catch (e: any) {
      console.error("Web Gen Error:", e);
      setError(e.message || "Terdapat ralat teknikal. Sila cuba lagi.");
      setIsGenerating(false);
      setIsRefining(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#020617] p-6 md:p-12 custom-scrollbar animate-up">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center space-y-6">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
              Neural Web Cinema Engine v2.0
            </span>
          </div>
          <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">
            Web <span className="text-purple-500">Gen</span>
          </h2>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.3em] max-w-lg mx-auto">
            Tukarkan idea laman web anda kepada video showcase bertaraf filem dalam masa saat.
          </p>
        </header>

        <div className={`glass-panel p-8 md:p-14 rounded-[4rem] border transition-all duration-700 relative overflow-hidden ${isGenerating ? 'border-purple-500/40 bg-purple-500/[0.02]' : 'border-white/5'}`}>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Website Visual Identity</label>
              <span className="text-[9px] font-mono text-slate-700">{webDesc.length} / 500</span>
            </div>
            
            <textarea 
              value={webDesc}
              onChange={(e) => setWebDesc(e.target.value.slice(0, 500))}
              disabled={isGenerating}
              placeholder="Contoh: Laman web jam tangan mewah, minimalist, warna hitam dan emas dengan efek 3D glassmorphism dan cahaya neon cyan..."
              className="w-full bg-black/60 border border-white/10 rounded-[2.5rem] p-10 text-xl md:text-2xl font-bold text-white outline-none focus:border-purple-500/50 transition-all min-h-[220px] resize-none placeholder:text-slate-800"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center justify-between pt-10 mt-10 border-t border-white/5 relative z-10">
            <div className="flex gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
               {['16:9', '9:16', '1:1'].map((ratio) => (
                 <button 
                  key={ratio}
                  onClick={() => !isGenerating && setAspectRatio(ratio)}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${aspectRatio === ratio ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/40' : 'bg-transparent text-slate-600 border-transparent hover:text-slate-400'}`}
                 >
                   {ratio}
                 </button>
               ))}
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !webDesc.trim() || isQuotaExhausted}
              className={`w-full md:w-auto px-16 py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-slate-800 text-slate-400' : 'bg-purple-600 text-white hover:bg-purple-500 active:scale-95 shadow-purple-900/30'}`}
            >
              <div className="relative z-10 flex items-center justify-center gap-4">
                {isGenerating ? (
                   <>
                     <div className="w-4 h-4 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin"></div>
                     <span>{isRefining ? 'AI Designing...' : 'Rendering...'}</span>
                   </>
                ) : (
                  <>
                    <span>Jana Video Web</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </>
                )}
              </div>
            </button>
          </div>
          
          {error && (
            <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl animate-up">
               <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">{error}</p>
            </div>
          )}

          {isQuotaExhausted && !isGenerating && (
             <p className="mt-8 text-center text-[10px] font-black text-red-500/60 uppercase tracking-widest">
               ⚠️ Kuota Video Anda Telah Habis. Sila hubungi admin.
             </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { title: "Landing Page", icon: "🌐", desc: "Showcase cinematic untuk laman web utama." },
             { title: "Dashboard UI", icon: "📊", desc: "Visualisasi data berteknologi tinggi." },
             { title: "e-Commerce", icon: "🛍️", desc: "Reveal produk premium dengan gaya Apple." }
           ].map((card, i) => (
             <div key={i} className="glass-panel p-8 rounded-3xl border border-white/5 hover:border-purple-500/20 transition-all group">
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-500">{card.icon}</div>
                <p className="text-[10px] font-black text-purple-400 uppercase mb-3 tracking-widest">{card.title}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{card.desc}</p>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default WebVideoView;
