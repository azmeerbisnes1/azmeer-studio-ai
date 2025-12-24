
import React from 'react';
import { AppView } from '../types.ts';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const logoUrl = "https://i.ibb.co/xqgH2MQ4/Untitled-design-18.png";

  const navItems = [
    { id: AppView.SORA_STUDIO, label: 'Sora Studio', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
    )},
    { id: AppView.HISTORY, label: 'Vault History', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )},
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 bg-[#020617] border-r border-slate-800/50 h-full p-8">
      <div className="flex items-center gap-4 mb-16">
        <div className="w-12 h-12 relative flex items-center justify-center">
          <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full"></div>
          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain relative z-10" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Azmeer</h1>
          <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mt-1">AI Studio</p>
        </div>
      </div>

      <nav className="flex-1 space-y-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-xs uppercase tracking-widest border ${
              activeView === item.id 
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.05)]' 
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-8 border-t border-slate-800/50">
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50">
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Neural Engine Status</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-bold text-emerald-500/80 uppercase">All Nodes Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
