
import React, { useState, useEffect, useRef } from 'react';
import { EngineType, HistoryItem, User, GeneratedVideo, GeneratedImage, GeneratedTTS } from './types';
import { getHistory, startVideoGen, refinePromptWithAI } from './services/geminigenService';
import { refinePromptWithOpenAI, generateUGCPrompt } from './services/openaiService';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { VideoCard } from './components/VideoCard';
import { ImageCard } from './components/ImageCard';
import { TTSCard } from './components/TTSCard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<EngineType>('SORA');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingUGC, setIsGeneratingUGC] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openaiManualKey, setOpenaiManualKey] = useState(localStorage.getItem('azmeer_manual_openai_key') || '');
  const [keySaved, setKeySaved] = useState(false);
  
  // UGC Config
  const [ugcGender, setUgcGender] = useState<'male' | 'female'>('female');
  const [ugcPlatform, setUgcPlatform] = useState<'tiktok' | 'facebook'>('tiktok');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadHistory();
      const interval = setInterval(loadHistory, 12000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (e) {
      console.error("Cluster sync failed");
    }
  };

  const saveApiKeyManually = () => {
    const key = openaiManualKey.trim();
    if (!key) return;
    localStorage.setItem('azmeer_manual_openai_key', key);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setError(null);
    try {
      await startVideoGen({
        prompt,
        model: 'sora-2',
        duration: 15,
        ratio: '9:16',
        imageFile: selectedImage || undefined
      });
      await loadHistory();
      setPrompt('');
      removeImage();
      setActiveTab('ARCHIVE'); 
    } catch (err: any) {
      setError(err.message || "Cluster generation failure.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!prompt) return;
    setIsRefining(true);
    setError(null);
    
    // Gunakan nilai terus dari state input (supaya tak perlu simpan dulu)
    const currentKey = openaiManualKey.trim();
    
    try {
      // Jika key ada (panjang sk-proj- biasanya > 40), gunakan OpenAI
      if (currentKey.length > 20) {
        const refined = await refinePromptWithOpenAI(prompt, currentKey);
        setPrompt(refined);
      } else {
        // Fallback ke Gemini jika OpenAI key tak diisi
        const refined = await refinePromptWithAI(prompt);
        setPrompt(refined);
      }
    } catch (err: any) {
      setError(err.message || "Gagal memproses idea.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateUGC = async () => {
    if (!prompt) return;
    setIsGeneratingUGC(true);
    setError(null);
    
    const currentKey = openaiManualKey.trim();
    if (currentKey.length < 20) {
      setError("Sila isi OpenAI API Key dahulu untuk fungsi UGC.");
      setIsGeneratingUGC(false);
      return;
    }

    try {
      const refined = await generateUGCPrompt({
        text: prompt,
        gender: ugcGender,
        platform: ugcPlatform,
        manualKey: currentKey
      });
      setPrompt(refined);
    } catch (err: any) {
      setError(err.message || "Gagal menjana skrip UGC.");
    } finally {
      setIsGeneratingUGC(false);
    }
  };

  const onAnimateFromHistory = (imageUrl: string, originalPrompt: string) => {
    setSelectedImage(imageUrl);
    setImagePreview(imageUrl);
    setPrompt(originalPrompt);
    setActiveTab('SORA');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!user) return <Login onLogin={setUser} />;

  const filteredHistory = history.filter(item => {
    if (activeTab === 'SORA') return item.mediaType === 'video';
    if (activeTab === 'ARCHIVE') return true;
    return false;
  });

  return (
    <div className="min-h-screen text-white selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-8 sm:mb-16 animate-up">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="cyber-logo-wrapper w-10 h-10 sm:w-14 sm:h-14">
              <div className="logo-glow-ring"></div>
              <img src="https://i.ibb.co/b5N15CGf/Untitled-design-18.png" className="cyber-logo-img w-full h-full object-contain" alt="Azmeer Logo" />
            </div>
            <div>
               <h1 className="text-xl sm:text-2xl font-black font-orbitron tracking-tighter uppercase leading-none">Azmeer AI Studio</h1>
               <div className="flex items-center gap-2 mt-1">
                 <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                 <div className="text-[7px] sm:text-[8px] font-black text-cyan-500 tracking-[0.2em] sm:tracking-[0.3em] uppercase">Sora 2 Elite Network</div>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {user.role === 'admin' && (
              <button 
                onClick={() => setActiveTab(activeTab === 'ADMIN' ? 'SORA' : 'ADMIN')}
                className={`flex-1 sm:flex-none h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'ADMIN' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-red-900/10 text-red-500 border border-red-500/20 hover:bg-red-900/20'}`}
              >
                Admin
              </button>
            )}
            <button onClick={() => setUser(null)} className="flex-1 sm:flex-none h-10 sm:h-12 px-4 sm:px-6 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">Disconnect</button>
          </div>
        </header>

        {activeTab === 'ADMIN' ? (
          <AdminDashboard users={[]} allVideos={history.filter(i => i.mediaType === 'video') as GeneratedVideo[]} onUpdateUser={() => {}} />
        ) : (
          <div className="max-w-5xl mx-auto space-y-6 sm:space-y-12">
            
            <nav className="flex justify-center animate-up">
              <div className="inline-flex w-full sm:w-auto p-1 bg-slate-900/60 backdrop-blur-3xl rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
                <button
                  onClick={() => setActiveTab('SORA')}
                  className={`flex-1 sm:flex-none px-6 sm:px-12 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'SORA' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Sora 2
                </button>
                <button
                  onClick={() => setActiveTab('ARCHIVE')}
                  className={`flex-1 sm:flex-none px-6 sm:px-12 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'ARCHIVE' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Archive
                </button>
              </div>
            </nav>

            <div className="space-y-6 sm:space-y-8 animate-up">
              
              {/* API Terminal */}
              <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 transition-all hover:border-cyan-500/20 group">
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 sm:border-r border-white/5 w-full sm:w-auto">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400">OpenAI Terminal</span>
                </div>
                <input 
                  type="password" 
                  value={openaiManualKey} 
                  onChange={(e) => setOpenaiManualKey(e.target.value)} 
                  placeholder="Isi sk-proj-... di sini"
                  className="w-full sm:flex-grow bg-transparent border-none outline-none text-[10px] sm:text-xs font-mono text-cyan-400 placeholder:text-slate-800"
                />
                <button 
                  onClick={saveApiKeyManually}
                  className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 transform ${keySaved ? 'bg-green-600 text-white scale-105 shadow-lg shadow-green-900/20' : 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600 hover:text-white active:scale-95'}`}
                >
                  {keySaved ? 'DISIMPAN ✓' : 'SIMPAN KUNCI'}
                </button>
              </div>

              {/* Main Prompt Suite */}
              <div className="glass-panel p-6 sm:p-12 rounded-3xl sm:rounded-[3.5rem] border border-white/5 relative overflow-hidden">
                <div className="flex flex-col gap-6 sm:gap-8">
                  <div className="flex-grow">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={selectedImage ? "Describe the motion for this product..." : "Tulis idea video anda di sini..."}
                      className="w-full bg-transparent border-none outline-none text-lg sm:text-3xl font-medium min-h-[120px] sm:min-h-[160px] placeholder:text-slate-800 transition-all focus:placeholder:text-slate-700 resize-none"
                    />
                  </div>
                  
                  {imagePreview && (
                    <div className="relative w-full sm:w-48 aspect-video sm:aspect-square bg-black/40 rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 group">
                      <img src={imagePreview} className="w-full h-full object-cover" alt="source" />
                      <button 
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1.5 sm:p-2 bg-black/60 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                   <div className="flex items-center gap-3 w-full sm:w-auto">
                     <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Karakter:</span>
                     <select 
                        value={ugcGender} 
                        onChange={(e) => setUgcGender(e.target.value as any)}
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[9px] font-bold text-cyan-400 outline-none hover:border-cyan-500/40"
                     >
                       <option value="female">Woman (Hijab)</option>
                       <option value="male">Man (Polite)</option>
                     </select>
                   </div>
                   <div className="flex items-center gap-3 w-full sm:w-auto">
                     <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Platform:</span>
                     <select 
                        value={ugcPlatform} 
                        onChange={(e) => setUgcPlatform(e.target.value as any)}
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[9px] font-bold text-purple-400 outline-none hover:border-purple-500/40"
                     >
                       <option value="tiktok">TikTok Style</option>
                       <option value="facebook">FB/IG Style</option>
                     </select>
                   </div>
                   <div className="flex-grow"></div>
                   <button 
                      onClick={handleGenerateUGC}
                      disabled={isGeneratingUGC || !prompt}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGeneratingUGC ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth={2}/></svg>}
                      <span>Gen UGC Prompt</span>
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-8 pt-8 border-t border-white/5">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  
                  <div className="flex gap-3 h-14 sm:h-16">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-14 sm:w-16 flex items-center justify-center rounded-xl sm:rounded-2xl border transition-all ${selectedImage ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/10'}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth={2}/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth={2}/></svg>
                    </button>

                    <button 
                      onClick={handleRefine}
                      disabled={isRefining || !prompt}
                      className="flex-grow sm:flex-none bg-white/5 hover:bg-white/10 px-6 sm:px-10 rounded-xl sm:rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isRefining && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                      <span>Guna AI (Prompt)</span>
                    </button>
                  </div>

                  <button 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !prompt}
                    className="h-14 sm:h-16 flex-grow relative overflow-hidden bg-cyan-600 hover:bg-cyan-500 px-8 sm:px-12 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-2xl shadow-cyan-900/40 active:scale-95"
                  >
                    <span>{isGenerating ? 'Rendering...' : 'Jana Video Sora 2'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RESULTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 animate-up" style={{ animationDelay: '0.3s' }}>
              {filteredHistory.length > 0 ? (
                filteredHistory.map(item => {
                  if (item.mediaType === 'video') return <VideoCard key={item.uuid} video={item} />;
                  if (item.mediaType === 'image' && activeTab === 'ARCHIVE') return <ImageCard key={item.uuid} image={item} onAnimate={() => onAnimateFromHistory(item.url, item.prompt)} />;
                  if (item.mediaType === 'tts' && activeTab === 'ARCHIVE') return <TTSCard key={item.uuid} tts={item} />;
                  return null;
                })
              ) : (
                <div className="col-span-full py-16 sm:py-32 text-center border-2 border-dashed border-white/5 rounded-3xl sm:rounded-[3rem]">
                   <p className="text-[9px] sm:text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">Tiada rekod</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-6 sm:bottom-10 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-red-600/90 backdrop-blur-3xl px-6 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-2xl text-[9px] font-black uppercase tracking-widest border border-red-500/50 shadow-2xl z-50 flex items-center justify-between sm:justify-center gap-6 animate-up max-w-[90vw]">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2.5}/></svg>
            <span className="truncate">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-white/50 hover:text-white transition-colors">✕</button>
        </div>
      )}
    </div>
  );
};

export default App;
