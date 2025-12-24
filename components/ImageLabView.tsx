
import React, { useState } from 'react';
import { generateGeminiImage } from '../services/geminiService';

const ImageLabView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("1:1");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResult(null);
    try {
      const url = await generateGeminiImage(prompt, aspectRatio);
      setResult(url);
    } catch (error) {
      console.error(error);
      alert("Gagal menjana imej. Sila cuba lagi sebentar.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-8 md:p-12 overflow-y-auto custom-scrollbar animate-up">
      <div className="max-w-6xl mx-auto w-full pb-32">
        <header className="mb-16 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30">
            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Imagen Engine Node</span>
          </div>
          <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">
            Image <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">Lab</span>
          </h2>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-8">
            <div className="glass-panel p-8 rounded-[3rem] border border-white/5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Neural Description</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Terangkan visual imaginasi anda..."
                className="w-full h-48 bg-black/40 border border-white/10 rounded-[2rem] p-6 text-sm text-slate-200 outline-none focus:border-orange-500/50 transition-all resize-none italic"
              />
              
              <div className="mt-10">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Output Format</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["1:1", "16:9", "9:16"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-4 text-[10px] font-black rounded-2xl border transition-all uppercase tracking-widest ${
                        aspectRatio === ratio 
                          ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-xl' 
                          : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full mt-10 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 disabled:opacity-50 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] text-white transition-all shadow-2xl shadow-orange-900/30 flex items-center justify-center gap-4 group"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Asset</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className={`aspect-square bg-slate-900/40 rounded-[4rem] border border-white/5 flex items-center justify-center overflow-hidden relative group shadow-2xl ${aspectRatio === '16:9' ? 'aspect-video' : aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square'}`}>
              {result ? (
                <>
                  <img src={result} alt="Generated" className="w-full h-full object-contain animate-up" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                    <a 
                      href={result} 
                      download={`Azmeer_Lab_${Date.now()}.png`}
                      className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl"
                    >
                      Muat Turun JPG
                    </a>
                  </div>
                </>
              ) : isGenerating ? (
                <div className="text-center space-y-8 p-12">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-8 border-orange-500/10 rounded-full"></div>
                    <div className="absolute inset-0 border-8 border-t-orange-500 rounded-full animate-spin"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-black text-orange-400 uppercase tracking-widest animate-pulse">Neural Manifesting</p>
                    <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em]">Querying Imagen Cluster</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-10 px-16">
                  <div className="w-32 h-32 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <svg className="w-16 h-16 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">Studio aset anda akan muncul di sini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageLabView;
