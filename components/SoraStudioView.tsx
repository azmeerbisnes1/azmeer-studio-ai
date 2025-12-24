
import React, { useState, useRef } from 'react';
import { startVideoGen, refinePromptWithAI } from '../services/geminigenService.ts';
import { db } from '../services/supabaseService.ts';
import { AppView, User } from '../types.ts';

interface SoraStudioViewProps {
  onViewChange: (view: AppView) => void;
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
}

const SoraStudioView: React.FC<SoraStudioViewProps> = ({ onViewChange, user, onUserUpdate }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [duration, setDuration] = useState(15);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isQuotaExhausted = user.role !== 'admin' && (user.videoLimit || 0) <= 0;

  const handleMagicRefine = async () => {
    if (!prompt.trim() || isRefining) return;
    setIsRefining(true);
    const refined = await refinePromptWithAI(prompt);
    setPrompt(refined);
    setIsRefining(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt || isGenerating || isQuotaExhausted) return;
    setIsGenerating(true);
    try {
      const res = await startVideoGen({
        prompt,
        duration,
        ratio: aspectRatio,
        imageFile: selectedFile || undefined
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
      onViewChange(AppView.HISTORY);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#020617] p-6 md:p-12 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="text-center space-y-4 animate-up">
          <div className="inline-block px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-black text-cyan-400 uppercase tracking-widest">
            Sora 2.0 Powered by Gemini 3
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase">
            Create <span className="text-cyan-500">Cinema</span>
          </h2>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">
            Baki Kuota: <span className="text-white">{user.role === 'admin' ? '∞' : user.videoLimit}</span>
          </p>
        </header>

        <div className="glass-panel p-8 md:p-12 rounded-[3rem] border border-white/5 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45z"/></svg>
          </div>

          <div className="space-y-4 relative z-10">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visual Concept</label>
            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your cinematic vision..."
                className="w-full bg-black/40 border border-white/10 rounded-3xl p-8 text-xl md:text-2xl font-bold text-white outline-none focus:border-cyan-500/50 transition-all min-h-[200px] resize-none"
              />
              <button 
                onClick={handleMagicRefine}
                disabled={isRefining || !prompt}
                className="absolute bottom-6 right-6 px-6 py-3 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-white rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-2"
              >
                {isRefining ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"/> : '✨ Magic Refine'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference Image (Optional)</label>
                <div 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${imagePreview ? 'border-cyan-500/50' : 'border-white/5 hover:border-white/20'}`}
                >
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover rounded-3xl" alt="Preview"/>
                  ) : (
                    <div className="text-center space-y-2">
                       <svg className="w-8 h-8 text-slate-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" strokeWidth={2}/></svg>
                       <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Click to Upload</p>
                    </div>
                  )}
                </div>
                <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange}/>
              </div>
            </div>

            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</label>
                    <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none">
                      <option value={10}>10 SECONDS</option>
                      <option value={15}>15 SECONDS</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ratio</label>
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none">
                      <option value="9:16">PORTRAIT (9:16)</option>
                      <option value="16:9">CINEMA (16:9)</option>
                    </select>
                  </div>
               </div>
               
               <button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt || isQuotaExhausted}
                className="w-full py-6 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl shadow-cyan-900/20"
               >
                 {isGenerating ? 'Initializing Neural Link...' : isQuotaExhausted ? 'Quota Exhausted' : 'Generate Video'}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoraStudioView;
