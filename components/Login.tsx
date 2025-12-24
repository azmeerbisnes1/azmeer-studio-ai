
import React, { useState, useEffect } from 'react';
import { db } from '../services/supabaseService';

interface LoginProps {
  onLogin: (user: any) => void;
}

const LOGO_URL = "https://i.ibb.co/b5N15CGf/Untitled-design-18.png";

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'setup'>('login');
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  const [setupData, setSetupData] = useState({ url: '', key: '' });
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfigReady, setIsConfigReady] = useState(true);

  useEffect(() => {
    const ready = db.isReady();
    setIsConfigReady(ready);
    if (!ready) setMode('setup');
  }, []);

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupData.url && setupData.key) {
      db.setManualKeys(setupData.url, setupData.key);
    } else {
      setError('Sila masukkan kedua-dua URL dan Key.');
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigReady) return;

    setIsProcessing(true);
    setError('');

    const cleanUsername = formData.username.toLowerCase().trim();

    try {
      if (mode === 'login') {
        const remoteUser = await db.getUser(cleanUsername);
        
        if (remoteUser && remoteUser.error) {
          setError(remoteUser.error);
        } else if (remoteUser && remoteUser.password === formData.password) {
          onLogin(remoteUser.data);
        } else if (remoteUser === null) {
          setError('ID Pengguna tidak dijumpai.');
        } else {
          setError('Kata laluan salah.');
        }
      } else if (mode === 'signup') {
        const existing = await db.getUser(cleanUsername);
        
        if (existing && existing.error) {
          setError(existing.error);
          setIsProcessing(false);
          return;
        }

        if (existing) { 
          setError('ID Pengguna sudah didaftarkan.'); 
          setIsProcessing(false); 
          return; 
        }

        const newUser = { 
          id: Math.random().toString(36).substr(2, 9), 
          username: cleanUsername, 
          email: formData.email,
          password: formData.password, 
          role: 'user', 
          status: 'pending',
          videoLimit: 0, 
          picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}` 
        };
        
        const res: any = await db.saveUser(newUser.username, newUser.password, newUser);
        if (res && !res.error) {
          onLogin(newUser);
        } else {
          setError(res?.error || 'Pendaftaran gagal.');
        }
      }
    } catch (err: any) {
      setError(`Ralat Sistem: ${err.message}`);
    }
    setIsProcessing(false);
  };

  if (mode === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans">
        <div className="max-w-md w-full glass-panel rounded-[3rem] p-10 text-center border-amber-500/20">
          <div className="mb-6 text-amber-500 flex justify-center">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-xl font-black text-white uppercase mb-4">Setup Diperlukan</h2>
          <p className="text-xs text-slate-400 mb-8 leading-relaxed">
            Google AI Studio dikesan. Sila masukkan kredensial Supabase anda secara manual untuk mengaktifkan fungsi login di persekitaran ini.
          </p>
          <form onSubmit={handleSetup} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-4">Supabase URL</label>
              <input 
                type="text" 
                placeholder="https://xyz.supabase.co" 
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-amber-500" 
                onChange={e => setSetupData({...setupData, url: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-4">Anon Key</label>
              <input 
                type="password" 
                placeholder="eyJhbG..." 
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-amber-500" 
                onChange={e => setSetupData({...setupData, key: e.target.value})}
              />
            </div>
            <button type="submit" className="w-full py-4 bg-amber-600 hover:bg-amber-500 rounded-2xl font-black text-[10px] uppercase text-white tracking-widest transition-all">
              SIMPAN & AKTIFKAN
            </button>
          </form>
          {isConfigReady && (
             <button onClick={() => setMode('login')} className="mt-4 text-[9px] text-slate-600 hover:text-white uppercase tracking-widest">Guna Kunci Sedia Ada</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden font-sans">
      <div className="max-w-md w-full glass-panel rounded-[3rem] p-10 text-center border-white/10 relative z-10">
        <div className="cyber-logo-wrapper mb-8">
           <div className="logo-glow-ring"></div>
           <img src={LOGO_URL} className="w-24 h-24 mx-auto cyber-logo-img" alt="Logo" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 font-orbitron">Azmeer AI Studio</h1>
        <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.4em] mb-8">Sora 2.0 Cinematic Portal</p>
        
        <form onSubmit={handleAction} className="space-y-4 text-left">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-4">Email Address</label>
              <input type="email" placeholder="example@email.com" required className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-cyan-500 transition-all" onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-4">Username</label>
            <input type="text" placeholder="ID ANDA" required className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-cyan-500 transition-all" onChange={e => setFormData({...formData, username: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-4">Password</label>
            <input type="password" placeholder="••••••••" required className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-cyan-500 transition-all" onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          
          <button type="submit" disabled={isProcessing} className="w-full mt-4 py-5 bg-cyan-600 hover:bg-cyan-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-lg active:scale-95 disabled:opacity-50">
            {isProcessing ? 'SEDANG DIPROSES...' : mode === 'login' ? 'LOG MASUK' : 'DAFTAR SEKARANG'}
          </button>
          
          {error && (
            <div className="mt-6 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl animate-up">
               <p className="text-[10px] text-red-400 font-bold leading-relaxed">{error}</p>
            </div>
          )}
          
          <div className="text-center mt-6 flex flex-col gap-3">
            <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-[10px] font-bold text-slate-500 uppercase hover:text-white transition-all tracking-widest">
              {mode === 'login' ? 'Belum ada akaun? Daftar Sini' : 'Sudah ada akaun? Log Masuk'}
            </button>
            <button type="button" onClick={() => setMode('setup')} className="text-[8px] font-black text-slate-700 hover:text-amber-500 uppercase tracking-[0.2em] transition-all">
              ⚙️ Tetapan Manual Supabase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
