
import React, { useState } from 'react';
import { startVideoGen, extractUuid } from '../services/geminigenService.ts';
import { generateUGCPrompt, refinePromptWithOpenAI } from '../services/openaiService.ts';
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
  const [isUGCProcessing, setIsUGCProcessing] = useState(false);
  const [duration, setDuration] = useState(15);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  const [ugcGender, setUgcGender] = useState<'male' | 'female'>('female');
  const [ugcPlatform, setUgcPlatform] = useState<'tiktok' | 'facebook'>('tiktok');

  const isQuotaExhausted = user.role !== 'admin' && (user.videoLimit || 0) <= 0;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleMagicRefine = async () => {
    if (!prompt.trim() || isRefining) return;
    setIsRefining(true);
    try {
      // Menggunakan locked logic dari OpenAI Service
      const refined = await refinePromptWithOpenAI(prompt);
      setPrompt(refined);
    } catch (e) { 
      console.error(e); 
      showToast("Refine Gagal. Sila semak API Key.");
    } finally { 
      setIsRefining(false); 
    }
  };

  const handleGenerateUGC = async () => {
    if (!prompt.trim() || isUGCProcessing) return;
    setIsUGCProcessing(true);
    try {
      // Menggunakan locked 15-second logic
      const ugcPrompt = await generateUGCPrompt({ 
        productDesc: prompt, 
        gender: ugcGender, 
        platform: ugcPlatform, 
        imageRef: imagePreview || undefined 
      });
      setPrompt(ugcPrompt);
    } catch (e: any) { 
      alert(e.message); 
    } finally { 
      setIsUGCProcessing(false); 
    }
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
      const uuid = extractUuid(res);

      if (uuid && user.username) {
        showToast("Video Berjaya Dihantar!");
        await db.saveUuid(user.username, uuid);
        
        if (user.role !== 'admin') {
          const updated = { ...user, videoLimit: (user.videoLimit || 0) - 1 };
          await db.updateUser(user.username, updated);
          if (onUserUpdate) onUserUpdate(updated);
        }

        onViewChange(AppView.HISTORY);
      } else {
        throw new Error("ID Video tidak ditemui dalam respons.");
      }
    } catch (e: any) {
      alert(`Gagal: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#020617] p-6 md:p-12 custom-scrollbar animate-up">
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-cyan-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest z-[100] shadow-2xl shadow-cyan-900/50 border border-white/20 animate-up">
           {toast}
        </div>
      )}
      <div className="max-w-4xl mx-auto space-y-12 pb-24">
        <header className="text-center space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-black text-cyan-400 uppercase tracking-widest">
            Neural Scripting Engine (LOCKED)
          </div>
          <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">
            Video <span className="text-cyan-500">Studio</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">
            Baki Kuota: <span className="text-white">{user.role === 'admin' ? 'UNLIMITED' : user.videoLimit}</span>
          </p>
        </header>

        <div className="glass-panel p-8 md:p-12 rounded-[3.5rem] border border-white/5 space-y-10 shadow-2xl">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Idea / Scripting</label>
            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Tulis idea anda..."
                className="w-full bg-black/40 border border-white/10 rounded-[2.5rem] p-8 text-xl md:text-2xl font-bold text-white outline-none focus:border-cyan-500/50 transition-all min-h-[200px] resize-none"
              />
              <button 
                onClick={handleMagicRefine}
                disabled={isRefining || !prompt}
                className="absolute bottom-6 right-6 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border border-white/10"
              >
                {isRefining ? 'REFASHIONING...' : '✨ Magic Refine (Elite)'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                 <p className="text-[8px] font-black text-slate-600 uppercase mb-3 tracking-widest">Karakter UGC</p>
                 <div className="flex gap-2">
                    <button onClick={() => setUgcGender('female')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${ugcGender === 'female' ? 'bg-indigo-600 text-white border-indigo-500' : 'text-slate-500 border-white/5'}`}>Wanita</button>
                    <button onClick={() => setUgcGender('male')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${ugcGender === 'male' ? 'bg-indigo-600 text-white border-indigo-500' : 'text-slate-500 border-white/5'}`}>Lelaki</button>
                 </div>
               </div>
               <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                 <p className="text-[8px] font-black text-slate-600 uppercase mb-3 tracking-widest">Platform Iklan</p>
                 <div className="flex gap-2">
                    <button onClick={() => setUgcPlatform('tiktok')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${ugcPlatform === 'tiktok' ? 'bg-rose-600 text-white border-rose-500' : 'text-slate-500 border-white/5'}`}>TikTok</button>
                    <button onClick={() => setUgcPlatform('facebook')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${ugcPlatform === 'facebook' ? 'bg-blue-600 text-white border-blue-500' : 'text-slate-500 border-white/5'}`}>FB/Ads</button>
                 </div>
               </div>
            </div>

            <button 
              onClick={handleGenerateUGC}
              disabled={isUGCProcessing || !prompt.trim() || isGenerating}
              className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-2xl"
            >
              {isUGCProcessing ? "SEDANG MENJANA SKRIP 15S..." : "Bina Skrip UGC Elite (15 Saat)"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div onClick={() => document.getElementById('v-file')?.click()} className={`aspect-video rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${imagePreview ? 'border-cyan-500/40 bg-black' : 'border-white/5 bg-black/20'}`}>
              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover rounded-[2.5rem]" alt="Preview"/> : <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Imej Rujukan (Optional)</p>}
              <input id="v-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange}/>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt || isQuotaExhausted || isUGCProcessing}
              className="w-full h-full min-h-[140px] bg-cyan-600 hover:bg-cyan-500 disabled:opacity-20 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl shadow-cyan-900/40"
            >
              {isGenerating ? 'Uplinking to Sora...' : 'JANA VIDEO SEKARANG'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoraStudioView;
