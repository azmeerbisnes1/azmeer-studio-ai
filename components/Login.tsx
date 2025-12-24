
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

    // Semakan Diagnostic - Jika database tidak sedia, berikan amaran jelas
    if (!db.isReady()) {
      setError('DATABASE ERROR: Sila pastikan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY telah dimasukkan di Vercel dan anda telah melakukan REDEPLOY.');
      setIsProcessing(false);
      return;
    }

    const cleanUsername = formData.username.toLowerCase().trim();

    // Hardcoded Admin Azmeer Credentials
    if (cleanUsername === 'azmeerbisnes1' && formData.password === 'Azm93112@') {
      const adminData = { 
        id: "admin-root", 
        name: "Azmeer (Root Admin)", 
        email: "azmeerbisnes1@gmail.com", 
        username: "azmeerbisnes1", 
        role: "admin", 
        status: "approved", 
        credits: 99999, 
        videoLimit: 99999, 
        azmeerLimit: 99999, 
        videosGenerated: 0, 
        azmeerGenerated: 0, 
        picture: "https://api.dicebear.com/7.x/bottts/svg?seed=azmeer", 
        password: formData.password 
      };
      try {
        await db.saveUser(adminData.username, adminData.password, adminData);
        onLogin(adminData);
      } catch (err) {
        onLogin(adminData); // Masuk juga sebagai fallback
      }
      return;
    }

    if (mode === 'login') {
      try {
        const remoteUser = await db.getUser(cleanUsername);
        if (remoteUser && remoteUser.password === formData.password) {
          const userData = remoteUser.data;
          
          if (userData.status === 'rejected') {
            setError('Akaun anda telah ditolak/digantung. Sila hubungi Admin Azmeer.');
            setIsProcessing(false);
            return;
          }
          
          onLogin(userData);
        } else {
          setError('ID Pengguna atau Kata Laluan tidak sah.');
          setIsProcessing(false);
        }
      } catch (err) {
        setError('Ralat sambungan database. Sila semak status Supabase anda.');
        setIsProcessing(false);
      }
    } else {
      try {
        const existing = await db.getUser(cleanUsername);
        
        if (existing) { 
          setError('ID Pengguna ini sudah didaftarkan.'); 
          setIsProcessing(false); 
          return; 
        }
        
        const newUser = { 
          id: Math.random().toString(36).substr(2, 9), 
          name: formData.username, 
          email: formData.email, 
          username: cleanUsername, 
          password: formData.password, 
          role: 'user', 
          status: 'pending',
          credits: 0, 
          videoLimit: 0, 
          azmeerLimit: 0, 
          videosGenerated: 0, 
          azmeerGenerated: 0, 
          picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}` 
        };
        
        const res = await db.saveUser(newUser.username, newUser.password, newUser);
        if (res) {
          onLogin(newUser);
        } else {
          setError('Gagal mendaftar. Sila pastikan Table azmeer_users telah dicipta di Supabase.');
          setIsProcessing(false);
        }
      } catch (err) {
        setError('Pendaftaran terganggu. Sila cuba lagi.');
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #1e293b 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
      {!db.isReady() && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest py-2 text-center z-50">
          ⚠️ CONFIGURATION ERROR: Supabase Keys are Missing from Environment Variables
        </div>
      )}
      <div className="max-w-xl w-full glass-panel rounded-[4rem] p-10 sm:p-20 text-center border-white/10 relative z-10 animate-up">
        <div className="mb-14 sm:mb-20 flex justify-center">
          <div className="cyber-logo-wrapper hover:scale-110"><div className="logo-glow-ring !w-[180%] !h-[180%]"></div><img src={LOGO_URL} alt="Azmeer AI Logo" className="cyber-logo-img !w-32 !h-32 sm:!w-48 sm:!h-48" /></div>
        </div>
        <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-black font-orbitron text-white uppercase tracking-tighter mb-4">Azmeer AI Studio</h1>
            <p className="text-[10px] sm:text-[12px] text-cyan-400 font-bold uppercase tracking-[0.5em] opacity-60">Sistem Akses Pintar v3.0</p>
        </div>
        <form onSubmit={handleAction} className="space-y-5">
          {mode === 'signup' && (
            <div className="relative group animate-up"><input type="email" placeholder="ALAMAT EMEL" required onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-5 text-xs font-mono text-white outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700" /></div>
          )}
          <div className="relative group animate-up" style={{ animationDelay: '0.1s' }}><input type="text" placeholder="ID PENGGUNA" required onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-5 text-xs font-mono text-white outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700" /></div>
          <div className="relative group animate-up" style={{ animationDelay: '0.2s' }}><input type="password" placeholder="KUNCI KESELAMATAN (PASSWORD)" required onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-5 text-xs font-mono text-white outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700" /></div>
          <button type="submit" disabled={isProcessing} className={`w-full py-6 mt-8 bg-gradient-to-r from-cyan-700 to-cyan-500 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.4em] text-white shadow-2xl shadow-cyan-900/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 ${isProcessing ? 'opacity-50' : ''}`}>
            {isProcessing ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <span>Masuk Sekarang</span>}
          </button>
          {error && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest bg-red-500/10 py-4 rounded-xl border border-red-500/20 mt-6">{error}</p>}
          <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-[10px] font-black text-slate-500 uppercase mt-10 block mx-auto hover:text-white transition-all tracking-[0.3em] hover:scale-105">{mode === 'login' ? 'Daftar Akaun Baru' : 'Log Masuk Sedia Ada'}</button>
        </form>
        <div className="mt-16 pt-8 border-t border-white/5 opacity-20"><p className="text-[8px] font-mono text-slate-400">SAMBUNGAN SELAMAT & TERENKRIPSI</p></div>
      </div>
    </div>
  );
};
