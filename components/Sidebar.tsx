
import React from 'react';
import { AppView, User } from '../types.ts';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  user?: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, user }) => {
  const logoUrl = "https://i.ibb.co/b5N15CGf/Untitled-design-18.png";

  const navItems = [
    { id: AppView.SORA_STUDIO, label: 'Studio Video', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
    )},
    { id: AppView.HISTORY, label: 'Koleksi Video', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    )},
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: AppView.ADMIN, label: 'Admin', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
    )});
  }

  return (
    <aside className="hidden md:flex flex-col w-72 bg-[#020617] border-r border-white/5 h-full p-8 relative z-30">
      <div className="flex items-center gap-4 mb-16 px-2">
        <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Azmeer</h1>
          <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mt-1">AI Studio</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-[10px] uppercase tracking-widest border ${
              activeView === item.id 
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-8 border-t border-white/5">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 text-center">
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Sora 2.0 Engine</p>
          <p className="text-[9px] font-bold text-emerald-500 uppercase">Live Connection</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
