
import React, { useState, useRef } from 'react';
import { startVideoGen, getSpecificHistory, fetchVideoAsBlob } from '../services/geminigenService.ts';
import { generateUGCPrompt, refinePromptWithAI } from '../services/geminiService.ts';
import { db } from '../services/supabaseService.ts';
import { AppView } from '../types.ts';

interface SoraStudioViewProps {
  onViewChange: (view: AppView) => void;
  user?: any;
}

const SoraStudioView: React.FC<SoraStudioViewProps> = ({ onViewChange, user }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [duration, setDuration] = useState(15);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Wizard states
  const [wizardGender, setWizardGender] = useState<'lelaki' | 'perempuan'>('perempuan');
  const [wizardPlatform, setWizardPlatform] = useState<'tiktok' | 'facebook'>('tiktok');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<number | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUGCWizard = async () => {
    if (!prompt.trim() || isRefining) return;
    setIsRefining(true);
    try {
      const wizardResult = await generateUGCPrompt({
        productDescription: prompt,
        gender: wizardGender,
        platform: wizardPlatform
      });
      setPrompt(wizardResult);
      setAspectRatio('9:16');
      setDuration(15);
    } finally {
      setIsRefining(false);
    }
  };

  const handleMagicRefine = async () => {
    if (!prompt.trim() || isRefining) return;
    setIsRefining(true);
    try {
      const refined = await refinePromptWithAI(prompt);
      setPrompt(refined);
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const res = await startVideoGen({
        prompt,
        model: 'sora-2',
        duration,
        ratio: aspectRatio,
        imageFile: selectedImage || undefined
      });

      const uuid = res?.uuid || res?.data?.uuid || res?.result?.uuid;
      if (uuid && user?.username) await db.saveUuid(user.username, uuid);

      setPrompt('');
      setSelectedImage(null);
      setImagePreview(null);
      onViewChange(AppView.HISTORY);
    } catch (error: any) {
      alert(error.message || "Gagal menghubungi kluster GPU.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-6 md:p-12 animate-up overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl w-full space-y-12 pb-32">
        <header className="text-center space-y-6 pt-10">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-2 backdrop-blur-xl">
             <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_12px_cyan]"></div>
             <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em]">Sora 2.0 Elite Node</span>
          </div>
          <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">
            Dream in <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Motion</span>
          </h2>
          <p className="text-slate-500 text-sm md:text-xl max-w-2xl mx-auto font-medium opacity-80 leading-relaxed">
            Hampa taip visi sinematik hampa, biar AI kami manifestkan realiti.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" /></svg>
                UGC Creator Wizard
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Karakter</label>
                   <select value={wizardGender} onChange={(e) => setWizardGender(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-cyan-500/40">
                      <option value="perempuan">Wanita (Hijab)</option>
                      <option value="lelaki">Lelaki (Influencer)</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Platform</label>
                   <select value={wizardPlatform} onChange={(e) => setWizardPlatform(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-cyan-500/40">
                      <option value="tiktok">TikTok (9:16)</option>
                      <option value="facebook">Facebook (1:1)</option>
                   </select>
                </div>
              </div>

              <button onClick={handleUGCWizard} disabled={isRefining || !prompt} className="w-full py-4 bg-cyan-600/10 border border-cyan-500/30 text-cyan-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-600 hover:text-white transition-all">
                {isRefining ? 'Consulting GPT-4o...' : 'Jana Skrip UGC'}
              </button>
            </div>

            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
               <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Temporal Settings</h3>
               <div className="grid grid-cols-2 gap-4">
                  {[10, 15].map(d => (
                    <button key={d} onClick={() => setDuration(d)} className={`py-4 rounded-xl text-[10px] font-black border transition-all ${duration === d ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-xl' : 'bg-white/5 border-white/5 text-slate-600'}`}>
                      {d} SAAT
                    </button>
                  ))}
               </div>
               <div className="grid grid-cols-2 gap-4">
                  {[ {l:'9:16', v:'9:16'}, {l:'16:9', v:'16:9'} ].map(r => (
                    <button key={r.v} onClick={() => setAspectRatio(r.v)} className={`py-4 rounded-xl text-[10px] font-black border transition-all ${aspectRatio === r.v ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-xl' : 'bg-white/5 border-white/5 text-slate-600'}`}>
                      {r.l}
                    </button>
                  ))}
               </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="glass-panel p-8 md:p-12 rounded-[3.5rem] border border-white/10 relative overflow-hidden group shadow-2xl">
              <div className="flex flex-col gap-8 relative z-10">
                <div className="relative">
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Terangkan info produk hampa kat sini..."
                    className="w-full bg-transparent border-none outline-none text-2xl md:text-4xl font-black placeholder:text-slate-800 text-white resize-none min-h-[250px] leading-tight custom-scrollbar"
                  />
                  <div className="flex justify-end mt-4">
                    <button onClick={handleMagicRefine} disabled={!prompt.trim() || isRefining} className="flex items-center gap-3 px-6 py-3 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-2xl transition-all disabled:opacity-30 group/btn">
                      {isRefining ? <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> : <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M7.5 5.6L10 7L8.6 4.5L10 2L7.5 3.4L5 2L6.4 4.5L5 7L7.5 5.6ZM19.5 15.4L17 14L18.4 16.5L17 19L19.5 17.6L22 19L20.6 16.5L22 14L19.5 15.4ZM22 2L19.5 3.4L17 2L18.4 4.5L17 7L19.5 5.6L22 7L20.6 4.5L22 2ZM14.3 5.4L4.7 15L9 19.3L18.6 9.7L14.3 5.4ZM17.1 6.9L14.3 4L13.1 5.2L15.9 8.1L17.1 6.9Z" /></svg>}
                      <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Cinema Refine</span>
                    </button>
                  </div>
                </div>

                {imagePreview && (
                  <div className="relative w-48 aspect-square rounded-[2rem] overflow-hidden border-2 border-cyan-500/30 shadow-2xl animate-up">
                    <img src={imagePreview} className="w-full h-full object-cover" alt="Source" />
                    <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                    </button>
                  </div>
                )}

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 pt-8 border-t border-white/5">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className={`h-20 px-10 rounded-[2rem] border-2 flex items-center justify-center transition-all ${selectedImage ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}>
                    <svg className="w-6 h-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" strokeWidth={2}/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">{selectedImage ? 'IMAGE SYNCED' : 'ATTACH REF'}</span>
                  </button>

                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt}
                    className="flex-1 h-20 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-xl transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-4 group/gen"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span>MANIFESTING...</span>
                      </>
                    ) : (
                      <>
                        <span>Synthesize Sora Video</span>
                        <svg className="w-5 h-5 group-hover/gen:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoraStudioView;
