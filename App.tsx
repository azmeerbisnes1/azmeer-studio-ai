
import React, { useState, useEffect, useRef } from 'react';
import { EngineType, HistoryItem, User, GeneratedVideo, GeneratedImage, GeneratedTTS } from './types';
import { getHistory, startVideoGen, refinePromptWithAI } from './services/geminigenService';
import { refinePromptWithOpenAI } from './services/openaiService';
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
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openaiManualKey, setOpenaiManualKey] = useState(localStorage.getItem('azmeer_manual_openai_key') || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('azmeer_manual_openai_key', openaiManualKey);
  }, [openaiManualKey]);

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
        duration: 10,
        ratio: '16:9',
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
    try {
      const refined = openaiManualKey.startsWith('sk-') 
        ? await refinePromptWithOpenAI(prompt)
        : await refinePromptWithAI(prompt);
      setPrompt(refined);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Refinement node error.");
    } finally {
      setIsRefining(false);
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
    if (activeTab === 'GEMINI') return item.mediaType === 'image' || item.mediaType === 'tts';
    if (activeTab === 'ARCHIVE') return true;
    return false;
  });

  return (
    <div className="min-h-screen text-white selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-16 animate-up">
          <div className="flex items-center gap-5">
            <div className="cyber-logo-wrapper w-14 h-14">
              <div className="logo-glow-ring"></div>
              <img src="https://i.ibb.co/b5N15CGf/Untitled-design-18.png" className="cyber-logo-img w-full h-full object-contain" alt="Azmeer Logo" />
            </div>
            <div>
               <h1 className="text-2xl font-black font-orbitron tracking-tighter uppercase leading-none">Azmeer AI Studio</h1>
               <div className="flex items-center gap-2 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                 <div className="text-[8px] font-black text-cyan-500 tracking-[0.3em] uppercase">Sora 2 Elite Network</div>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <button 
                onClick={() => setActiveTab(activeTab === 'ADMIN' ? 'SORA' : 'ADMIN')}
                className={`h-12 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'ADMIN' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-red-900/10 text-red-500 border border-red-500/20 hover:bg-red-900/20'}`}
              >
                Root Dashboard
              </button>
            )}
            <button onClick={() => setUser(null)} className="h-12 px-6 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">Disconnect</button>
          </div>
        </header>

        {activeTab === 'ADMIN' ? (
          <AdminDashboard users={[]} allVideos={history.filter(i => i.mediaType === 'video') as GeneratedVideo[]} onUpdateUser={() => {}} />
        ) : (
          <div className="max-w-5xl mx-auto space-y-12">
            
            {/* NAVIGATION TABS */}
            <nav className="flex justify-center animate-up" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex p-1.5 bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] border border-white/5 shadow-2xl">
                <button
                  onClick={() => setActiveTab('SORA')}
                  className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeTab === 'SORA' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Sora 2 Video
                </button>
                <button
                  onClick={() => setActiveTab('GEMINI')}
                  className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeTab === 'GEMINI' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Studio (IMG/TTS)
                </button>
                <button
                  onClick={() => setActiveTab('ARCHIVE')}
                  className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeTab === 'ARCHIVE' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Archive
                </button>
              </div>
            </nav>

            <div className="space-y-8 animate-up" style={{ animationDelay: '0.2s' }}>
              
              {/* OpenAI Terminal */}
              <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl p-4 flex flex-col sm:flex-row items-center gap-4 transition-all hover:border-cyan-500/20">
                <div className="flex items-center gap-3 px-4 border-r border-white/5">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">OpenAI Key</span>
                </div>
                <input 
                  type="text" 
                  value={openaiManualKey} 
                  onChange={(e) => setOpenaiManualKey(e.target.value)} 
                  placeholder="sk-proj-..."
                  className="flex-grow bg-transparent border-none outline-none text-xs font-mono text-cyan-400 placeholder:text-slate-800"
                />
              </div>

              {/* Main Prompt Suite */}
              <div className="glass-panel p-8 sm:p-12 rounded-[3.5rem] border border-white/5 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-8">
                  <div className="flex-grow">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={selectedImage ? "Describe the motion for this image..." : "Enter your cinematic description for Sora 2..."}
                      className="w-full bg-transparent border-none outline-none text-xl sm:text-3xl font-medium min-h-[160px] placeholder:text-slate-800 transition-all focus:placeholder:text-slate-700 resize-none"
                    />
                  </div>
                  
                  {/* i2v Image Preview */}
                  {imagePreview && (
                    <div className="relative w-full sm:w-48 aspect-video sm:aspect-square bg-black/40 rounded-2xl overflow-hidden border border-white/10 group">
                      <img src={imagePreview} className="w-full h-full object-cover" alt="i2v source" />
                      <button 
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-cyan-600/80 py-1 text-center text-[7px] font-black uppercase">i2v Mode Active</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-10 pt-10 border-t border-white/5">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                  />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-14 h-14 flex items-center justify-center rounded-2xl border transition-all ${selectedImage ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/10'}`}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth={2}/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth={2}/></svg>
                  </button>

                  <button 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !prompt}
                    className="relative overflow-hidden bg-cyan-600 hover:bg-cyan-500 px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all disabled:opacity-50 shadow-2xl shadow-cyan-900/40 active:scale-95"
                  >
                    <span>{isGenerating ? 'Rendering...' : 'Generate Video'}</span>
                  </button>

                  <button 
                    onClick={handleRefine}
                    disabled={isRefining || !prompt}
                    className="bg-white/5 hover:bg-white/10 px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 transition-all disabled:opacity-50 flex items-center gap-3"
                  >
                    {isRefining && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                    <span>AI Refine</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RESULTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-up" style={{ animationDelay: '0.3s' }}>
              {filteredHistory.length > 0 ? (
                filteredHistory.map(item => {
                  if (item.mediaType === 'video') return <VideoCard key={item.uuid} video={item} />;
                  if (item.mediaType === 'image') return <ImageCard key={item.uuid} image={item} onAnimate={() => onAnimateFromHistory(item.url, item.prompt)} />;
                  if (item.mediaType === 'tts') return <TTSCard key={item.uuid} tts={item} />;
                  return null;
                })
              ) : (
                <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                   <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">Sector Empty: No Assets Generated</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur-3xl px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-red-500/50 shadow-2xl z-50 flex items-center gap-6 animate-up">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2.5}/></svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
    </div>
  );
};

export default App;
