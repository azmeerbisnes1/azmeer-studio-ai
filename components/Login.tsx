
import React, { useState } from 'react';
import { db } from '../services/supabaseService';

interface LoginProps {
  onLogin: (user: any) => void;
}

const LOGO_URL = "https://i.ibb.co/b5N15CGf/Untitled-design-18.png";

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');

    if (!db.isReady()) {
      setError('Sila masukkan VITE_SUPABASE_URL & ANON_KEY di Vercel.');
      setIsProcessing(false);
      return;
    }

    const cleanUsername = formData.username.toLowerCase().trim();

    if (mode === 'login') {
      try {
        const remoteUser = await db.getUser(cleanUsername);
        if (remoteUser && !remoteUser.error && remoteUser.password === formData.password) {
          onLogin(remoteUser.data);
        } else if (remoteUser && remoteUser.error) {
          setError(remoteUser.error);
        } else {
          setError('ID Pengguna atau Kata Laluan salah.');
        }
      } catch (err) {
        setError('Masalah teknikal berlaku.');
      }
    } else {
      try {
        const existing = await db.getUser(cleanUsername);
        if (existing && !existing.error) { 
          setError('ID Pengguna sudah wujud.'); 
          setIsProcessing(false); 
          return; 
        }
        
        if (existing && existing.error) {
          setError(existing.error);
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
          setError(res?.error || 'Gagal mendaftar.');
        }
      } catch (err) {
        setError('Pendaftaran terganggu.');
      }
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden font-sans">
      <div className="max-w-md w-full glass-panel rounded-[3rem] p-10 text-center border-white/10 relative z-10">
        <img src={LOGO_URL} className="w-24 h-24 mx-auto mb-8 cyber-logo-img" alt="Logo" />
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 font-orbitron">Azmeer AI Studio</h1>
        
        <form onSubmit={handleAction} className="space-y-4">
          {mode === 'signup' && (
            <input type="email" placeholder="EMAIL" required className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-cyan-500" onChange={e => setFormData({...formData, email: e.target.value})} />
          )}
          <input type="text" placeholder="USERNAME" required className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-cyan-500" onChange={e => setFormData({...formData, username: e.target.value})} />
          <input type="password" placeholder="PASSWORD" required className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-cyan-500" onChange={e => setFormData({...formData, password: e.target.value})} />
          
          <button type="submit" disabled={isProcessing} className="w-full py-5 bg-cyan-600 hover:bg-cyan-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-lg">
            {isProcessing ? 'Processing...' : mode === 'login' ? 'LOGIN' : 'SIGN UP'}
          </button>
          
          {error && <p className="text-[9px] text-red-500 font-bold uppercase p-4 bg-red-500/10 rounded-xl border border-red-500/20">{error}</p>}
          
          <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-[10px] font-bold text-slate-500 uppercase hover:text-white transition-all">
            {mode === 'login' ? 'Daftar Akaun Baru' : 'Sudah ada akaun? Log Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
};
