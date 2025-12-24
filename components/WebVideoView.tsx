
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

  const isQuotaExhausted = user.role !== 'admin' && (user.videoLimit || 0) <= 0;

  const handleGenerate = async () => {
    if (!webDesc.trim() || isGenerating || isQuotaExhausted) return;
    
    setIsGenerating(true);
    setIsRefining(true);
    
    try {
      // 1. Guna Gemini untuk tukar deskripsi web kepada prompt video sinematik
      const cinematicPrompt = await generateWebVideoPrompt(webDesc);
      setIsRefining(false);
      
      // 2. Mula penjanaan video Sora 2.0
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
      
      // 3. Pindah ke History untuk lihat hasil
      onViewChange(AppView.HISTORY);
    } catch (e: any) {
      alert("Gagal menjana video: " + e.message);
    } finally {
      setIsGenerating(false);
      setIsRefining(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#020617] p-6 md:p-12 custom-scrollbar animate-up">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-block px-4 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-[10px] font-black text-purple-400 uppercase tracking-widest">
            Web-to-Cinema Engine
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase">
            Web <span className="text-purple-500">Generator</span>
          </h2>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">
            Bina video showcase laman web daripada teks sahaja.
          </p>
        </header>

        <div className="glass-panel p-8 md:p-12 rounded-[3rem] border border-white/5 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/></svg>
          </div>

          <div className="space-y-4 relative z-10">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Describe Your Website</label>
            <textarea 
              value={webDesc}
              onChange={(e) => setWebDesc(e.target.value)}
              placeholder="Contoh: Laman web jam tangan mewah, minimalist, warna hitam dan emas dengan efek 3D..."
              className="w-full bg-black/40 border border-white/10 rounded-3xl p-8 text-xl md:text-2xl font-bold text-white outline-none focus:border-purple-500/50 transition-all min-h-[180px] resize-none"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center justify-between pt-6 border-t border-white/5">
            <div className="flex gap-4">
               {['16:9', '9:16', '1:1'].map((ratio) => (
                 <button 
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${aspectRatio === ratio ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 text-slate-500 border-white/5'}`}
                 >
                   {ratio}
                 </button>
               ))}
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !webDesc.trim() || isQuotaExhausted}
              className="w-full md:w-auto px-12 py-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-purple-900/20"
            >
              {isRefining ? 'AI Membina UI Design...' : isGenerating ? 'Neural Video Rendering...' : 'Jana Video Web'}
            </button>
          </div>
          
          {isQuotaExhausted && (
             <p className="text-center text-[10px] font-black text-red-500 uppercase tracking-widest">Kuota Video Anda Habis.</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40">
           {[
             { title: "Landing Page", desc: "Showcase cinematic landing page." },
             { title: "App UI", desc: "High-tech mobile app visuals." },
             { title: "3D Mockup", desc: "Interactive 3D web environment." }
           ].map((card, i) => (
             <div key={i} className="glass-panel p-6 rounded-2xl border border-white/5">
                <p className="text-[9px] font-black text-purple-400 uppercase mb-2">{card.title}</p>
                <p className="text-[10px] text-slate-500">{card.desc}</p>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default WebVideoView;
