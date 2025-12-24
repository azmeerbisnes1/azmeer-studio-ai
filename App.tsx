
import React, { useState, useEffect } from 'react';
import { AppView, User } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import SoraStudioView from './components/SoraStudioView.tsx';
import HistoryView from './components/HistoryView.tsx';
import { Login } from './components/Login.tsx';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.SORA_STUDIO);
  const [user, setUser] = useState<User | null>(null);
  const logoUrl = "https://i.ibb.co/xqgH2MQ4/Untitled-design-18.png";

  useEffect(() => {
    const savedUser = localStorage.getItem('azmeer_active_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {}
    }
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('azmeer_active_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('azmeer_active_user');
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const renderView = () => {
    switch (activeView) {
      case AppView.SORA_STUDIO: return <SoraStudioView onViewChange={setActiveView} user={user} />;
      case AppView.HISTORY: return <HistoryView />;
      default: return <SoraStudioView onViewChange={setActiveView} user={user} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex flex-col bg-[#020617] border-b border-slate-800/50 z-20">
          <div className="flex items-center justify-between p-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-full animate-pulse"></div>
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain relative z-10" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tighter text-white uppercase leading-none">azmeer</h1>
                <p className="text-[8px] font-bold text-cyan-500 tracking-[0.2em] uppercase opacity-80 leading-none">ai studio</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-800 px-3 py-1.5 rounded-lg">Logout</button>
          </div>

          <nav className="flex px-4 pb-3 gap-2 overflow-x-auto custom-scrollbar">
            {[
              { id: AppView.SORA_STUDIO, label: 'Studio' },
              { id: AppView.HISTORY, label: 'Vault' }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex-none px-6 py-3 rounded-xl transition-all border font-black text-[10px] uppercase tracking-widest ${
                  activeView === item.id ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-slate-900/50 border-slate-800 text-slate-500'
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
