
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getHistory, startVideoGen } from './services/geminigenService';
import { generateUGCPrompt, refinePromptWithOpenAI } from './services/openaiService';
import { db } from './services/supabaseService';
import { AppState, EngineType, AspectRatio, HistoryItem, GeneratedVideo, User } from './types';
import { VideoCard } from './components/VideoCard';
import { ImageCard } from './components/ImageCard';
import { TTSCard } from './components/TTSCard';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';

const SORA_MODELS = [
  { id: 'sora-2', name: 'Sora 2 Elite', desc: 'Sintesis Visual Berkuasa Tinggi (Small/720p)', dur: [10, 15] }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [state, setState] = useState<AppState>({
    activeTab: 'SORA',
    isGenerating: false,
    isRefining: false,
    history: [],
    error: null,
    success: null,
    loadingMessage: ''
  });

  const [prompt, setPrompt] = useState('');
  const [refiningPlatform, setRefiningPlatform] = useState<'tiktok' | 'facebook' | 'general' | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFromArchive, setImageFromArchive] = useState<string>(''); 
  
  const [genMode, setGenMode] = useState<'T2V' | 'I2V'>('T2V');
  const [duration, setDuration] = useState(10);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'video' | 'image' | 'tts'>('all');
  
  const pollIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optimisticUuids = useRef<Set<string>>(new Set());

  // Check Session
  useEffect(() => {
    const savedUser = sessionStorage.getItem('azmeer_session');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // Sync Registry (Admin & User)
  useEffect(() => {
    const loadRegistry = async () => {
      const remoteUsers = await db.getAllUsers();
      if (remoteUsers && remoteUsers.length > 0) {
        setAllUsers(remoteUsers);
        localStorage.setItem('azmeer_global_registry', JSON.stringify(remoteUsers));
      } else {
        const local = JSON.parse(localStorage.getItem('azmeer_global_registry') || '[]');
        setAllUsers(local);
      }
    };
    loadRegistry();
  }, [user, state.activeTab]);

  const syncHistory = useCallback(async (silent = false) => {
    try {
      const apiData = await getHistory();
      setState(prev => {
        const apiMap = new Map(apiData.map(item => [item.uuid, item]));
        const mergedHistory = prev.history.map(oldItem => {
          const newItem = apiMap.get(oldItem.uuid);
          return newItem ? { ...oldItem, ...newItem } : oldItem;
        });
        const localUuids = new Set(prev.history.map(i => i.uuid));
        const trulyNewItems = apiData.filter(i => !localUuids.has(i.uuid));
        const combined = [...mergedHistory, ...trulyNewItems];
        apiData.forEach(item => {
          if (optimisticUuids.current.has(item.uuid)) optimisticUuids.current.delete(item.uuid);
        });
        return { ...prev, history: combined, error: null };
      });
      const hasAnyProcessing = apiData.some(item => item.mediaType === 'video' && item.status === 1) || optimisticUuids.current.size > 0;
      const nextInterval = hasAnyProcessing ? 10000 : 90000;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = window.setInterval(() => syncHistory(true), nextInterval);
    } catch (e: any) {
      if (!silent) console.warn("Sync unstable...", e.message);
      setState(prev => ({ ...prev, error: prev.history.length === 0 ? "Network sync unstable. Retrying..." : null }));
    }
  }, []);

  useEffect(() => {
    if (user) syncHistory();
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [user, syncHistory]);

  const [remoteUuids, setRemoteUuids] = useState<string[]>([]);
  useEffect(() => {
    if (user) {
      db.getUuids(user.id).then(res => {
        if (res && res.length > 0) {
          setRemoteUuids(res);
          localStorage.setItem(`uuids_${user.id}`, JSON.stringify(res));
        }
      });
    }
  }, [user]);

  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const threeHoursMs = 3 * 60 * 60 * 1000;
    let list = [...state.history];

    if (user && user.role !== 'admin') {
      const localUuids = JSON.parse(localStorage.getItem(`uuids_${user.id}`) || '[]');
      const myUuids = Array.from(new Set([...localUuids, ...remoteUuids]));
      list = list.filter(item => myUuids.includes(item.uuid) || optimisticUuids.current.has(item.uuid));
    }

    list = list.filter(item => (now - item.timestamp) < threeHoursMs);
    const sorted = list.sort((a, b) => b.timestamp - a.timestamp);
    if (archiveFilter === 'all') return sorted;
    return sorted.filter(item => item.mediaType === archiveFilter);
  }, [state.history, archiveFilter, user, remoteUuids]);

  const updateUserQuota = async (updatedUser: User) => {
    // 1. Save Locally for instant feedback
    const registry = JSON.parse(localStorage.getItem('azmeer_global_registry') || '[]');
    const newRegistry = registry.map((u: User) => u.id === updatedUser.id ? updatedUser : u);
    localStorage.setItem('azmeer_global_registry', JSON.stringify(newRegistry));
    setAllUsers(newRegistry);
    
    // 2. Save to Cloud (Supabase) - We await this to ensure persistence
    if (updatedUser.password) {
      await db.saveUser(updatedUser.username, updatedUser.password, updatedUser);
    }

    if (user && user.id === updatedUser.id) {
      setUser(updatedUser);
      sessionStorage.setItem('azmeer_session', JSON.stringify(updatedUser));
    }
  };

  const handleUGCClick = async (platform: 'tiktok' | 'facebook') => {
    if (!prompt.trim()) { setState(p => ({ ...p, error: "Sila masukkan idea atau nama produk dahulu." })); return; }
    setRefiningPlatform(platform);
    setState(p => ({ ...p, isRefining: true }));
    try {
      const ugcPrompt = await generateUGCPrompt(prompt, platform);
      setPrompt(ugcPrompt);
      setDuration(15); 
      setState(p => ({ ...p, isRefining: false, success: `Prompt UGC ${platform.toUpperCase()} Berjaya Dijana!` }));
      setTimeout(() => setState(p => ({ ...p, success: null })), 3000);
    } catch (e: any) { setState(p => ({ ...p, isRefining: false, error: e.message }));
    } finally { setRefiningPlatform(null); }
  };

  const handleRefineWithOpenAI = async () => {
    if (!prompt.trim()) return;
    setRefiningPlatform('general');
    setState(p => ({ ...p, isRefining: true }));
    try {
      const refined = await refinePromptWithOpenAI(prompt);
      setPrompt(refined);
      setState(p => ({ ...p, isRefining: false }));
    } catch (e) { setState(p => ({ ...p, isRefining: false }));
    } finally { setRefiningPlatform(null); }
  };

  const handleGenerate = async () => {
    if (!user) return;
    if (user.role !== 'admin') {
      if (user.status !== 'approved') {
        setState(p => ({ ...p, error: `AKSES DISEKAT: Status akaun anda adalah [${user.status.toUpperCase()}]. Sila tunggu kelulusan Admin.` }));
        return;
      }
      if (user.credits <= 0) {
        setState(p => ({ ...p, error: "KREDIT TAMAT: Sila hubungi Admin untuk tambah kredit." }));
        return;
      }
      if (user.videosGenerated >= user.videoLimit) {
        setState(p => ({ ...p, error: `HAD TERCAPAI: Anda telah menggunakan ${user.videosGenerated}/${user.videoLimit} kuota video.` }));
        return;
      }
    }
    if (!prompt.trim()) { setState(p => ({ ...p, error: "Prompt diperlukan." })); return; }
    setState(p => ({ ...p, isGenerating: true, error: null, loadingMessage: 'Menyambung ke Sora 2 Cluster...' }));
    try {
      const result = await startVideoGen({ prompt, model: "sora-2", duration, ratio: aspectRatio, imageFile: imageFile || imageFromArchive || undefined });
      const uuid = result.uuid;
      if (uuid) {
        // Local Save
        const myUuids = JSON.parse(localStorage.getItem(`uuids_${user.id}`) || '[]');
        myUuids.push(uuid);
        localStorage.setItem(`uuids_${user.id}`, JSON.stringify(myUuids));
        
        // Cloud Save - Await here so it doesn't get lost on refresh
        await db.saveUuid(user.id, uuid);

        optimisticUuids.current.add(uuid);
        const updatedUser = { ...user, credits: user.role === 'admin' ? user.credits : user.credits - 10, videosGenerated: user.videosGenerated + 1 };
        await updateUserQuota(updatedUser); // Ensure quota is synced
        
        const optimisticItem: GeneratedVideo = { mediaType: 'video', uuid: uuid, url: '', prompt: prompt, timestamp: Date.now(), status: 1, status_percentage: result.status_percentage || 1, aspectRatio: aspectRatio, model_name: 'Sora 2', duration: duration };
        setState(p => ({ ...p, isGenerating: false, activeTab: 'ARCHIVE', history: [optimisticItem, ...p.history], success: "Penjanaan Dimulakan! Sila tunggu rendering selesai." }));
      }
      setPrompt(''); setImageFile(null); setImagePreview(''); setImageFromArchive('');
      setTimeout(() => setState(p => ({ ...p, success: null })), 5000);
      setTimeout(() => syncHistory(true), 2000);
    } catch (e: any) { setState(p => ({ ...p, isGenerating: false, error: `RALAT: ${e.message}` })); }
  };

  const handleLogout = () => { sessionStorage.removeItem('azmeer_session'); setUser(null); };

  if (!user) return <Login onLogin={(u: User) => { setUser(u); sessionStorage.setItem('azmeer_session', JSON.stringify(u)); }} />;

  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-8 py-4 sm:py-6 flex flex-wrap justify-between items-center glass-panel border-b border-white/5 backdrop-blur-[50px]">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="cyber-logo-wrapper">
            <div className="logo-glow-ring"></div>
            <img src="https://i.ibb.co/b5N15CGf/Untitled-design-18.png" className="cyber-logo-img w-10 h-10 sm:w-16 sm:h-16" alt="Logo" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-orbitron font-black text-lg sm:text-2xl tracking-tighter text-white">AZMEER <span className="text-cyan-400">STUDIO</span></h1>
            <span className="text-[6px] sm:text-[8px] font-black text-cyan-500/50 tracking-[0.4em] uppercase">{user.role === 'admin' ? 'Root Admin Console' : `Node ID: ${user.username}`}</span>
          </div>
        </div>
        
        <div className="hidden lg:flex gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5">
          {(['SORA', 'ARCHIVE', ...(user.role === 'admin' ? ['ADMIN'] : [])] as any[]).map(tab => (
            <button key={tab} onClick={() => setState(p => ({ ...p, activeTab: tab as EngineType }))} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 hover:scale-105 ${state.activeTab === tab ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-900/40' : 'text-slate-500 hover:text-white'}`}>
              {tab === 'SORA' ? 'Studio' : tab === 'ARCHIVE' ? 'History' : 'Admin'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-5">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[9px] font-black text-white uppercase opacity-70">{user.status.toUpperCase()} MODE</span>
            <span className="text-[10px] font-mono font-bold text-cyan-400">Video: {user.videosGenerated}/{user.videoLimit}</span>
          </div>
          <button onClick={handleLogout} className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-all hover:rotate-12">
            <svg className="w-4 h-4 sm:w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth={2}/></svg>
          </button>
        </div>

        <div className="lg:hidden w-full flex justify-around mt-4 pt-4 border-t border-white/5">
           <button onClick={() => setState(p => ({ ...p, activeTab: 'SORA' }))} className={`flex flex-col items-center gap-1 ${state.activeTab === 'SORA' ? 'text-cyan-400' : 'text-slate-500'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth={2}/></svg>
              <span className="text-[8px] font-black uppercase">Studio</span>
           </button>
           <button onClick={() => setState(p => ({ ...p, activeTab: 'ARCHIVE' }))} className={`flex flex-col items-center gap-1 ${state.activeTab === 'ARCHIVE' ? 'text-cyan-400' : 'text-slate-500'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2}/></svg>
              <span className="text-[8px] font-black uppercase">History</span>
           </button>
           {user.role === 'admin' && (
             <button onClick={() => setState(p => ({ ...p, activeTab: 'ADMIN' }))} className={`flex flex-col items-center gap-1 ${state.activeTab === 'ADMIN' ? 'text-cyan-400' : 'text-slate-500'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth={2}/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth={2}/></svg>
                <span className="text-[8px] font-black uppercase">Admin</span>
             </button>
           )}
        </div>
      </nav>

      <main className="pt-44 sm:pt-48 pb-40 px-4 sm:px-10 max-w-7xl mx-auto">
        {state.activeTab === 'ADMIN' && user.role === 'admin' ? (
          <div className="animate-up"><AdminDashboard users={allUsers} allVideos={[]} onUpdateUser={updateUserQuota} /></div>
        ) : state.activeTab === 'SORA' ? (
          <div className="space-y-8 sm:space-y-12 animate-up">
            
            {user.role !== 'admin' && user.status !== 'approved' && (
              <div className={`p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border flex items-center justify-between transition-all hover:scale-[1.01] ${user.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center gap-4 sm:gap-6">
                   <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-lg sm:text-2xl shadow-inner ${user.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'}`}>!</div>
                   <div>
                     <h3 className={`text-sm sm:text-lg font-black uppercase ${user.status === 'pending' ? 'text-yellow-500' : 'text-red-500'}`}>Akaun {user.status === 'pending' ? 'Dalam Proses' : 'Disekat'}</h3>
                     <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Sila hubungi Admin untuk pengaktifan akaun atau bantuan lanjut.</p>
                   </div>
                </div>
              </div>
            )}

            <div className="glass-panel p-8 sm:p-20 rounded-[3rem] sm:rounded-[4rem] border-white/10 shadow-3xl relative">
              <div className="flex gap-4 sm:gap-6 mb-10 sm:mb-14">
                <button onClick={() => setGenMode('T2V')} className={`flex-1 py-4 sm:py-6 rounded-2xl sm:rounded-3xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] border transition-all duration-500 ${genMode === 'T2V' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.2)]' : 'bg-black/20 border-white/5 text-slate-600 hover:text-slate-400'}`}>Text to Video</button>
                <button onClick={() => setGenMode('I2V')} className={`flex-1 py-4 sm:py-6 rounded-2xl sm:rounded-3xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] border transition-all duration-500 ${genMode === 'I2V' ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)]' : 'bg-black/20 border-white/5 text-slate-600 hover:text-slate-400'}`}>Image to Video</button>
              </div>

              {genMode === 'I2V' && (
                <div className="mb-10 space-y-8 animate-up">
                  <div className="flex justify-between items-center px-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference Image</label>
                    {imagePreview && <button onClick={() => { setImagePreview(''); setImageFile(null); }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Remove</button>}
                  </div>
                  <div onClick={() => !imagePreview && fileInputRef.current?.click()} className={`relative border-2 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center justify-center transition-all min-h-[220px] cursor-pointer group ${imagePreview ? 'border-purple-500/40 bg-purple-500/5' : 'border-slate-800 bg-black/40 hover:border-purple-500/30'}`}>
                    <input type="file" ref={fileInputRef} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if(file) {
                        setImageFile(file);
                        const r = new FileReader();
                        r.onload = () => setImagePreview(r.result as string);
                        r.readAsDataURL(file);
                      }
                    }} accept="image/*" className="hidden" />
                    {imagePreview ? (
                      <img src={imagePreview} className="w-40 h-40 rounded-3xl object-cover border border-purple-500/30 shadow-2xl transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto text-purple-400">
                           <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth={2}/></svg>
                        </div>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Muat Naik Imej Rujukan</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="relative mb-6 animate-up">
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Terangkan visual/produk impian anda..." className="w-full bg-black/50 border border-slate-800 rounded-[3rem] p-8 sm:p-12 text-sm sm:text-lg text-white placeholder:text-slate-700 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 outline-none min-h-[250px] transition-all" />
                <button onClick={handleRefineWithOpenAI} disabled={state.isRefining || !prompt.trim()} className="absolute bottom-6 sm:bottom-10 right-6 sm:right-10 flex items-center gap-3 bg-slate-900/90 border border-white/5 hover:bg-slate-800 disabled:opacity-30 text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105">
                  {state.isRefining && refiningPlatform === 'general' ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg>}
                  <span>{state.isRefining && refiningPlatform === 'general' ? "Processing..." : "Refine Prompt"}</span>
                </button>
              </div>

              {genMode === 'I2V' && (
                <div className="mb-14 p-6 sm:p-8 bg-purple-500/5 border border-purple-500/20 rounded-[2.5rem] space-y-4 animate-up">
                   <div className="flex items-center gap-3 ml-2">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center"><svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg></div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-300">UGC Video Generator</h4>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={() => handleUGCClick('tiktok')} disabled={state.isRefining} className="flex-1 flex items-center justify-center gap-3 bg-black/60 border border-white/10 hover:border-purple-500/50 py-5 rounded-2xl transition-all group overflow-hidden relative">
                         {state.isRefining && refiningPlatform === 'tiktok' ? <div className="w-4 h-4 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div> : <span className="text-[9px] font-black uppercase tracking-widest text-white group-hover:text-purple-400">Generate TikTok UGC</span>}
                      </button>
                      <button onClick={() => handleUGCClick('facebook')} disabled={state.isRefining} className="flex-1 flex items-center justify-center gap-3 bg-black/60 border border-white/10 hover:border-cyan-500/50 py-5 rounded-2xl transition-all group overflow-hidden relative">
                         {state.isRefining && refiningPlatform === 'facebook' ? <div className="w-4 h-4 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div> : <span className="text-[9px] font-black uppercase tracking-widest text-white group-hover:text-cyan-400">Generate Facebook UGC</span>}
                      </button>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-14 animate-up">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Aspect Ratio</label>
                  <div className="flex gap-2.5 p-2 bg-black/40 border border-slate-800 rounded-3xl">
                    {['16:9', '9:16'].map(r => (
                      <button key={r} onClick={() => setAspectRatio(r as AspectRatio)} className={`flex-grow py-5 rounded-2xl text-[10px] font-black transition-all ${aspectRatio === r ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>{r === '16:9' ? 'Landscape (16:9)' : 'Portrait (9:16)'}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Duration Control</label>
                  <div className="flex gap-2.5 p-2 bg-black/40 border border-slate-800 rounded-3xl">
                    {[10, 15].map(d => (
                      <button key={d} onClick={() => setDuration(d)} className={`flex-grow py-5 rounded-2xl text-[10px] font-black transition-all ${duration === d ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>{d} Seconds</button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={handleGenerate} disabled={state.isGenerating || !prompt.trim() || (user.role !== 'admin' && (user.status !== 'approved' || user.videosGenerated >= user.videoLimit))} className={`w-full mt-14 sm:mt-20 py-8 sm:py-10 disabled:grayscale disabled:opacity-50 text-white rounded-[2.5rem] sm:rounded-[3rem] font-black text-[10px] sm:text-sm uppercase tracking-[0.5em] shadow-[0_20px_60px_-15px_rgba(8,145,178,0.3)] transition-all hover:scale-[1.02] active:scale-95 ${genMode === 'I2V' ? 'bg-gradient-to-r from-purple-700 to-purple-500' : 'bg-gradient-to-r from-cyan-700 to-cyan-500'}`}>
                {state.isGenerating ? <div className="flex items-center justify-center gap-4"><div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div><span>SYNCING WITH CLUSTER...</span></div> : (user.role !== 'admin' && user.status !== 'approved') ? `ACCOUNT ${user.status.toUpperCase()}` : (user.role !== 'admin' && user.videosGenerated >= user.videoLimit) ? 'LIMIT REACHED - LOCKED' : 'Launch Sora 2 Engine'}
              </button>
            </div>

            {state.error && <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] text-center text-[10px] font-black text-red-500 uppercase tracking-[0.2em] animate-up">{state.error}</div>}
            {state.success && <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-[2.5rem] text-center text-[10px] font-black text-green-500 uppercase tracking-[0.2em] animate-up">{state.success}</div>}
          </div>
        ) : (
          <div className="space-y-12 animate-up">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 px-6">
              <div className="space-y-2 text-center md:text-left">
                <h2 className="font-orbitron font-black text-4xl sm:text-5xl uppercase tracking-tighter text-white">Cloud Archive</h2>
                <p className="text-[10px] font-black text-cyan-500/50 uppercase tracking-[0.4em]">Optimized Sync • Node: {user.username}</p>
              </div>
              <div className="flex items-center gap-2 p-1.5 bg-black/40 border border-white/5 rounded-2xl">
                {['all', 'video', 'image', 'tts'].map(f => <button key={f} onClick={() => setArchiveFilter(f as any)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${archiveFilter === f ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{f}</button>)}
              </div>
            </div>

            <div className="px-6">
              <div className="p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-[2rem] flex items-center gap-4 animate-up">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2}/></svg></div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Sistem Arkib Automatik</h4>
                  <p className="text-[9px] text-slate-500 font-medium leading-relaxed">Nota: Semua hasil jananaan akan dipadamkan daripada arkib awam selepas 3 jam untuk keselamatan data anda.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
              {filteredHistory.length > 0 ? filteredHistory.map((item, idx) => (
                <div key={item.uuid} className="animate-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  {item.mediaType === 'video' ? <VideoCard video={item} /> : item.mediaType === 'image' ? <ImageCard image={item} /> : <TTSCard tts={item} />}
                </div>
              )) : (
                <div className="col-span-full py-48 text-center opacity-30">
                  <div className="w-20 h-20 bg-slate-800/20 rounded-full flex items-center justify-center mx-auto mb-6"><svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" strokeWidth={2}/></svg></div>
                  <p className="text-[12px] font-black uppercase tracking-[0.6em]">No Records Found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
