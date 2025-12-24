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
        text: prompt,
        gender: ugcGender,
        platform: ugcPlatform
      });
      setPrompt(ugcPrompt);
      setDuration(15); // UGC is fixed at 15s
      setAspectRatio('9:16'); // UGC standard for reels/tiktok
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
            Cinematic Neural Engine Sora 2.0
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
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visual Concept / Product Description</label>
               {isUGCProcessing && <span className="text-[9px] font-black text-purple-400 animate-pulse uppercase tracking-widest">AI sedang merangka UGC Script...</span>}
            </div>
            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Terangkan produk anda atau idea video UGC..."
                className="w-full bg-black/40 border border-white/10 rounded-[2.5rem] p-8 text-xl md:text-2xl font-bold text-white outline-none focus:border-cyan-500/50 transition-all min-h-[220px] resize-none"
              />
              <div className="absolute bottom-6 right-6 flex gap-3">
                <button 
                  onClick={handleMagicRefine}
                  disabled={isRefining || isUGCProcessing || !prompt}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border border-white/10"
                >
                  {isRefining ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"/> : '✨ Refine'}
                </button>
              </div>
            </div>
          </div>

          {/* UGC Generator Controls */}
          <div className="p-8 rounded-[2.5rem] bg-purple-500/5 border border-purple-500/20 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">UGC Script Generator (OpenAI GPT-4o-mini)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Pilih Watak Influencer</p>
                <div className="flex gap-3">
                   <button 
                    onClick={() => setUgcGender('female')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${ugcGender === 'female' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                   >
                     Wanita (Berhijab)
                   </button>
                   <button 
                    onClick={() => setUgcGender('male')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${ugcGender === 'male' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                   >
                     Lelaki (Sopan)
                   </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Pilih Platform (Auto CTA)</p>
                <div className="flex gap-3">
                   <button 
                    onClick={() => setUgcPlatform('tiktok')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${ugcPlatform === 'tiktok' ? 'bg-black border-white/20 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                   >
                     TikTok
                   </button>
                   <button 
                    onClick={() => setUgcPlatform('facebook')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${ugcPlatform === 'facebook' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                   >
                     Facebook
                   </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleGenerateUGC}
              disabled={isUGCProcessing || !prompt.trim() || isGenerating}
              className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-3"
            >
              {isUGCProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Sedang Merangka Skrip UGC...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  <span>Bina Skrip UGC Sinematik (15s)</span>
                </>
              )}
            </button>
          </div>

          {/* Media & Settings Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Imej Rujukan (Opsional)</label>
               <div onClick={() => document.getElementById('v-file')?.click()} className={`aspect-video rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${imagePreview ? 'border-cyan-500/40 bg-black' : 'border-white/5 hover:border-white/10 bg-black/20'}`}>
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover rounded-[2rem]" alt="Rujukan"/>
                  ) : (
                    <div className="text-center">
                       <svg className="w-10 h-10 text-slate-800 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" strokeWidth={1}/></svg>
                       <p className="text-[8px] font-black text-slate-800 uppercase tracking-widest">Upload Imej</p>
                    </div>
                  )}
               </div>
               <input id="v-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange}/>
            </div>

            <div className="flex flex-col justify-end space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase ml-2">Durasi</label>
                    <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none">
                      <option value={10}>10 SAAT</option>
                      <option value={15}>15 SAAT</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase ml-2">Format</label>
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none">
                      <option value="16:9">LANDSCAPE</option>
                      <option value="9:16">PORTRAIT</option>
                      <option value="1:1">SQUARE</option>
                    </select>
                  </div>
               </div>
               
               <button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt || isQuotaExhausted || isUGCProcessing}
                className="w-full py-6 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-20 text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-95"
               >
                 {isGenerating ? 'MENYAMBUNG NEURAL LINK...' : isQuotaExhausted ? 'KUOTA HABIS' : 'JANA VIDEO SORA 2'}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoraStudioView;