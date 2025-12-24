
import React, { useState } from 'react';
import { startVideoGen, refinePromptWithAI } from '../services/geminigenService.ts';
import { generateUGCPrompt } from '../services/openaiService.ts';
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
  
  const [ugcGender, setUgcGender] = useState<'male' | 'female'>('female');
  const [ugcPlatform, setUgcPlatform] = useState<'tiktok' | 'facebook'>('tiktok');

  const isQuotaExhausted = user.role !== 'admin' && (user.videoLimit || 0) <= 0;

  const handleMagicRefine = async () => {
    if (!prompt.trim() || isRefining) return;
    setIsRefining(true);
    try {
      const refined = await refinePromptWithAI(prompt);
      setPrompt(refined);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateUGC = async () => {
    if (!prompt.trim() || isUGCProcessing) return;
    setIsUGCProcessing(true);
    try {
      const ugcPrompt = await generateUGCPrompt({
        productDesc: prompt,
        gender: ugcGender,
        platform: ugcPlatform,
        imageRef: imagePreview || undefined
      });
      setPrompt(ugcPrompt);
      setDuration(15);
      setAspectRatio('9:16');
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

      // KRITIKAL: Geminigen pulangkan UUID dalam res.data.uuid atau res.uuid
      const actualData = res?.data || res;
      const uuid = actualData?.uuid || actualData?.id;

      if (uuid && user.username) {
        console.log(`[Neural Link] Saving UUID: ${uuid} for ${user.username}`);
        await db.saveUuid(user.username, uuid);
        
        if (user.role !== 'admin') {
          const updated = { ...user, videoLimit: (user.videoLimit || 0) - 1 };
          await db.updateUser(user.username, updated);
          if (onUserUpdate) onUserUpdate(updated);
        }
        // Tunggu sebentar untuk Supabase sync
        setTimeout(() => onViewChange(AppView.HISTORY), 500);
      } else {
        throw new Error("UUID tidak ditemui dalam respons server.");
      }
    } catch (e: any) {
      alert(`Gagal Menjana: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#020617] p-6 md:p-12 custom-scrollbar animate-up">
      <div className="max-w-4xl mx-auto space-y-12 pb-24">
        <header className="text-center space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-black text-cyan-400 uppercase tracking-widest">
            Neural Scripting Engine Active
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
            <div className="flex justify-between items-center px-4">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Penerangan Produk / Idea Iklan</label>
            </div>
            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Tulis idea iklan anda..."
                className="w-full bg-black/40 border border-white/10 rounded-[2.5rem] p-8 text-xl md:text-2xl font-bold text-white outline-none focus:border-cyan-500/50 transition-all min-h-[200px] resize-none"
              />
              <div className="absolute bottom-6 right-6 flex gap-3">
                <button 
                  onClick={handleMagicRefine}
                  disabled={isRefining || isUGCProcessing || !prompt}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border border-white/10"
                >
                  {isRefining ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"/> : '✨ Magic Refine'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-indigo-500/[0.03] border border-indigo-500/20 space-y-8 shadow-inner">
             <button 
              onClick={handleGenerateUGC}
              disabled={isUGCProcessing || !prompt.trim() || isGenerating}
              className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30"
            >
              {isUGCProcessing ? "SEDANG MENJANA SKRIP..." : "Bina Skrip UGC (GPT-4o-mini)"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Imej Rujukan / Produk</label>
               <div onClick={() => document.getElementById('v-file')?.click()} className={`aspect-video rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ${imagePreview ? 'border-cyan-500/40 bg-black' : 'border-white/5 bg-black/20'}`}>
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover rounded-[2.5rem]" alt="Produk"/>
                  ) : (
                    <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Upload Gambar Produk</p>
                  )}
               </div>
               <input id="v-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange}/>
            </div>

            <div className="flex flex-col justify-end space-y-6">
               <button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt || isQuotaExhausted || isUGCProcessing}
                className="w-full py-7 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-20 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl shadow-cyan-900/40"
               >
                 {isGenerating ? 'Rendering Sora 2.0...' : isQuotaExhausted ? 'HAD KUOTA DICAPAI' : 'JANA VIDEO SEKARANG'}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoraStudioView;
