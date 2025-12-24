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
  
  // UGC States
  const [ugcGender, setUgcGender] = useState<'male' | 'female'>('female');
  const [ugcPlatform, setUgcPlatform] = useState<'tiktok' | 'facebook'>('tiktok');

  const isQuotaExhausted = user.role !== 'admin' && (user.videoLimit || 0) <= 0;

  const handleMagicRefine = async () => {
    if (!prompt.trim() || isRefining) return;
    setIsRefining(true);
    const refined = await refinePromptWithAI(prompt);
    setPrompt(refined);
    setIsRefining(false);
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
      setDuration(15); // UGC standard 15s
      setAspectRatio('9:16'); // Optimized for social media
    } catch (e: any) {
      alert("Gagal menjana skrip: " + e.message);
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
    <div className="flex-1 overflow-y-auto bg-[#020617] p-6 md:p-12 custom-scrollbar animate-up">
      <div className="max-w-4xl mx-auto space-y-12 pb-24">
        <header className="text-center space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-black text-cyan-400 uppercase tracking-widest">
            Sora 2.0 UGC Cinema Engine
          </div>
          <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">
            Video <span className="text-cyan-500">Studio</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">
            Baki Kuota: <span className="text-white">{user.role === 'admin' ? 'UNLIMITED' : user.videoLimit}</span>
          </p>
        </header>

        <div className="glass-panel p-8 md:p-12 rounded-[3.5rem] border border-white/5 space-y-10">
          
          {/* Main Prompt Area */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-4">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Penerangan Produk / Idea Iklan</label>
               {isUGCProcessing && <span className="text-[9px] font-black text-purple-400 animate-pulse uppercase tracking-widest">GPT-4o-mini Merangka Skrip...</span>}
            </div>
            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Tulis penerangan produk anda di sini untuk dijadikan video UGC sinematik..."
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

          {/* UGC Control Panel */}
          <div className="p-8 rounded-[2.5rem] bg-indigo-500/[0.03] border border-indigo-500/20 space-y-8 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">UGC Script Engine (GPT-4o-mini)</h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">Pilih Watak Utama</p>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setUgcGender('female')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all border ${ugcGender === 'female' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-900/50 border-white/5 text-slate-500'}`}
                   >
                     Wanita (Hijab)
                   </button>
                   <button 
                    onClick={() => setUgcGender('male')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all border ${ugcGender === 'male' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-900/50 border-white/5 text-slate-500'}`}
                   >
                     Lelaki (Sopan)
                   </button>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">Destinasi Iklan (CTA)</p>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setUgcPlatform('tiktok')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all border ${ugcPlatform === 'tiktok' ? 'bg-black border-white/30 text-white shadow-lg' : 'bg-slate-900/50 border-white/5 text-slate-500'}`}
                   >
                     TikTok Style
                   </button>
                   <button 
                    onClick={() => setUgcPlatform('facebook')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all border ${ugcPlatform === 'facebook' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-900/50 border-white/5 text-slate-500'}`}
                   >
                     Facebook Ads
                   </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleGenerateUGC}
              disabled={isUGCProcessing || !prompt.trim() || isGenerating}
              className="w-full py-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30"
            >
              {isUGCProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Sedang Menganalisis Skrip...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  <span>Bina Skrip UGC Sinematik (15s)</span>
                </>
              )}
            </button>
            <p className="text-center text-[8px] text-slate-700 font-bold uppercase tracking-widest">
              Setiap 3 saat sudut kamera berubah secara automatik. Karakter Melayu 30-an.
            </p>
          </div>

          {/* Media Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Imej Rujukan / Produk</label>
               <div onClick={() => document.getElementById('v-file')?.click()} className={`aspect-video rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ${imagePreview ? 'border-cyan-500/40 bg-black shadow-lg shadow-cyan-900/10' : 'border-white/5 hover:border-white/10 bg-black/20'}`}>
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover rounded-[2.5rem] animate-up" alt="Produk"/>
                  ) : (
                    <div className="text-center">
                       <svg className="w-12 h-12 text-slate-800 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" strokeWidth={1}/></svg>
                       <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Upload Gambar Produk</p>
                    </div>
                  )}
               </div>
               <input id="v-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange}/>
            </div>

            <div className="flex flex-col justify-end space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase ml-2">Masa Video</label>
                    <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-cyan-500/40">
                      <option value={10}>10 SAAT</option>
                      <option value={15}>15 SAAT (UGC)</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase ml-2">Nisbah Aspek</label>
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-cyan-500/40">
                      <option value="9:16">PORTRAIT (Reels/TikTok)</option>
                      <option value="16:9">LANDSCAPE (Youtube)</option>
                      <option value="1:1">SQUARE (Post)</option>
                    </select>
                  </div>
               </div>
               
               <button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt || isQuotaExhausted || isUGCProcessing}
                className="w-full py-7 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-20 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl active:scale-[0.98] shadow-cyan-900/40"
               >
                 {isGenerating ? 'Neural Rendering Sora 2.0...' : isQuotaExhausted ? 'HAD KUOTA DICAPAI' : 'JANA VIDEO SEKARANG'}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoraStudioView;