
import React, { useState, useEffect } from 'react';
import { AppView, User } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import SoraStudioView from './components/SoraStudioView.tsx';
import HistoryView from './components/HistoryView.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { Login } from './components/Login.tsx';
import { db } from './services/supabaseService.ts';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.SORA_STUDIO);
  const [user, setUser] = useState<User | null>(null);
  const logoUrl = "https://i.ibb.co/b5N15CGf/Untitled-design-18.png";

  useEffect(() => {
    const savedUser = localStorage.getItem('azmeer_active_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        refreshUser(parsed.username);
      } catch (e) {}
    }
  }, []);

  const refreshUser = async (username: string) => {
    try {
      const remoteUser = await db.getUser(username);
      if (remoteUser && remoteUser.data) {
        setUser(remoteUser.data);
        localStorage.setItem('azmeer_active_user', JSON.stringify(remoteUser.data));
      }
    } catch (e) {
      console.error("Gagal sync data user:", e);
    }
  };

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('azmeer_active_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('azmeer_active_user');
  };

  if (!user) return <Login onLogin={handleLogin} />;

  if (user.status !== 'approved' && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #1e293b 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="max-w-xl w-full glass-panel rounded-[4rem] p-12 sm:p-20 text-center border-amber-500/20 relative z-10 animate-up">
           <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-amber-500/30">
              <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
           </div>
           <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Akses Disekat</h2>
           <p className="text-slate-400 text-sm leading-relaxed mb-10">
              Hai <span className="text-cyan-400 font-bold">{user.username}</span>, akaun anda sedang dalam proses semakan oleh <span className="text-white font-bold">Admin Azmeer</span>. Sila tunggu sehingga akaun anda disahkan untuk mula menggunakan studio.
           </p>
           <button onClick={handleLogout} className="w-full py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Log Keluar</button>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case AppView.SORA_STUDIO: return <SoraStudioView onViewChange={setActiveView} user={user} onUserUpdate={setUser} />;
      case AppView.HISTORY: return <HistoryView user={user} />;
      case AppView.ADMIN: return <AdminDashboard currentUser={user} />;
      default: return <SoraStudioView onViewChange={setActiveView} user={user} onUserUpdate={setUser} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      <Sidebar activeView={activeView} onViewChange={setActiveView} user={user} />

      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex flex-col bg-[#020617] border-b border-white/5 z-20">
          <div className="flex items-center justify-between p-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 relative flex items-center justify-center">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain relative z-10" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tighter text-white uppercase leading-none">azmeer</h1>
                <p className="text-[8px] font-bold text-cyan-500 tracking-[0.2em] uppercase leading-none">ai studio</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-800 px-3 py-1.5 rounded-lg">Logout</button>
          </div>

          <nav className="flex px-4 pb-3 gap-2 overflow-x-auto">
            {[
              { id: AppView.SORA_STUDIO, label: 'Studio' },
              { id: AppView.HISTORY, label: 'Koleksi' },
              ...(user.role === 'admin' ? [{ id: AppView.ADMIN, label: 'Admin' }] : [])
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex-none px-6 py-3 rounded-xl transition-all border font-black text-[10px] uppercase tracking-widest ${
                  activeView === item.id ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-slate-900/50 border-white/5 text-slate-500'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
