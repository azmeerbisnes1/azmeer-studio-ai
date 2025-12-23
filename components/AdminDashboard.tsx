
import React, { useState, useEffect } from 'react';
import { User, GeneratedVideo, GeneratedImage } from '../types';

interface AdminDashboardProps {
  users: User[];
  allVideos: GeneratedVideo[];
  onUpdateUser: (updatedUser: User) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, allVideos, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'history' | 'deploy'>('users');
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'history') {
      const logs: any[] = [];
      users.forEach(u => {
        const uVids = JSON.parse(localStorage.getItem(`vids_${u.id}`) || '[]');
        const uImgs = JSON.parse(localStorage.getItem(`imgs_${u.id}`) || '[]');
        
        uVids.forEach((v: any) => logs.push({ ...v, userName: u.name, type: 'VIDEO' }));
        uImgs.forEach((i: any) => logs.push({ ...i, userName: u.name, type: 'IMAGE' }));
      });
      setGlobalLogs(logs.sort((a, b) => b.timestamp - a.timestamp));
    }
  }, [activeTab, users]);

  const handleStatusChange = (user: User, status: User['status']) => {
    if (user.role === 'admin' && status === 'rejected') return;
    onUpdateUser({ ...user, status });
  };

  const updateQuota = (user: User, field: 'videoLimit' | 'azmeerLimit', value: string) => {
    const num = parseInt(value) || 0;
    onUpdateUser({ ...user, [field]: num });
  };

  const handleCreditChange = (user: User, amount: number) => {
    onUpdateUser({ ...user, credits: Math.max(0, (user.credits || 0) + amount) });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Approved Nodes</p>
          <p className="text-3xl font-black font-orbitron text-cyan-400">{users.filter(u => u.status === 'approved').length}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pending Sync</p>
          <p className="text-3xl font-black font-orbitron text-yellow-500">{users.filter(u => u.status === 'pending').length}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total System Logs</p>
          <p className="text-3xl font-black font-orbitron text-purple-400">{globalLogs.length || '...'}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Network Credits</p>
          <p className="text-3xl font-black font-orbitron text-emerald-400">
            {users.reduce((acc, curr) => acc + (curr.credits || 0), 0)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 p-1 bg-black/40 rounded-2xl border border-white/5 w-fit">
        <button onClick={() => setActiveTab('users')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>Node Management</button>
        <button onClick={() => setActiveTab('history')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Azmeer Logs</button>
        <button onClick={() => setActiveTab('deploy')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'deploy' ? 'bg-orange-600 text-white' : 'text-slate-500'}`}>Deployment</button>
      </div>

      {activeTab === 'users' ? (
        <section className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-10 overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em] border-b border-slate-800">
                <th className="pb-8">User Identity</th>
                <th className="pb-8 text-center">Status</th>
                <th className="pb-8 text-center">Video Limit</th>
                <th className="pb-8 text-center">Usage</th>
                <th className="pb-8 text-center">Credits</th>
                <th className="pb-8 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {users.map(u => (
                <tr key={u.id} className="group hover:bg-white/[0.02]">
                  <td className="py-6">
                    <div className="flex items-center gap-4">
                      <img src={u.picture} className="w-10 h-10 rounded-xl border border-slate-800" />
                      <div>
                        <div className="text-sm font-bold text-slate-200">{u.name} {u.role === 'admin' && <span className="text-[8px] bg-red-600 px-1 rounded ml-1">ROOT</span>}</div>
                        <div className="text-[9px] text-slate-500 font-mono">{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${u.status === 'approved' ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5' : u.status === 'pending' ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'}`}>{u.status}</span>
                  </td>
                  <td className="py-6 text-center">
                    <input 
                      type="number" 
                      value={u.videoLimit} 
                      onChange={(e) => updateQuota(u, 'videoLimit', e.target.value)} 
                      className="w-20 bg-black/60 border border-cyan-500/20 rounded-lg px-2 py-2 text-xs text-center font-black font-mono text-cyan-400 focus:border-cyan-500 outline-none transition-all" 
                    />
                  </td>
                  <td className="py-6 text-center">
                    <div className="text-xs font-mono text-slate-400">{u.videosGenerated} / {u.videoLimit}</div>
                    <div className="w-20 h-1 bg-slate-800 mx-auto mt-1 rounded-full overflow-hidden">
                       <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, (u.videosGenerated / (u.videoLimit || 1)) * 100)}%` }}></div>
                    </div>
                  </td>
                  <td className="py-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <button onClick={() => handleCreditChange(u, -100)} className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg text-[10px]">-100</button>
                       <span className="text-xs font-mono font-bold">{u.credits}</span>
                       <button onClick={() => handleCreditChange(u, 100)} className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg text-[10px]">+100</button>
                    </div>
                  </td>
                  <td className="py-6 text-right space-x-2">
                    {u.status !== 'approved' && (
                      <button onClick={() => handleStatusChange(u, 'approved')} className="text-[8px] font-black bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg uppercase transition-all shadow-lg shadow-cyan-900/20">Approve</button>
                    )}
                    {u.status !== 'rejected' && u.role !== 'admin' && (
                      <button onClick={() => handleStatusChange(u, 'rejected')} className="text-[8px] font-black bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-500 hover:text-white px-4 py-2 rounded-lg uppercase transition-all">Reject</button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="py-20 text-center text-slate-500 uppercase text-[10px] tracking-widest">Tiada rekod pengguna dalam pangkalan data</td></tr>
              )}
            </tbody>
          </table>
        </section>
      ) : activeTab === 'history' ? (
        <section className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-10 overflow-x-auto">
           <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em] border-b border-slate-800">
                <th className="pb-8">Timestamp</th>
                <th className="pb-8">User Identity</th>
                <th className="pb-8">Type</th>
                <th className="pb-8">Prompt Snippet</th>
                <th className="pb-8 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
               {globalLogs.map((log, idx) => (
                 <tr key={idx} className="group hover:bg-white/[0.02]">
                    <td className="py-6 text-[10px] font-mono text-slate-500">
                       {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-6 text-xs font-bold text-slate-300">
                       {log.userName}
                    </td>
                    <td className="py-6">
                       <span className={`px-2 py-1 rounded text-[8px] font-black ${log.type === 'VIDEO' ? 'bg-cyan-900/40 text-cyan-400' : 'bg-orange-900/40 text-orange-400'}`}>
                          {log.type}
                       </span>
                    </td>
                    <td className="py-6 text-[10px] text-slate-400 italic max-w-xs truncate">
                       "{log.prompt}"
                    </td>
                    <td className="py-6 text-right">
                       <a href={log.url} target="_blank" rel="noreferrer" className="text-white bg-slate-800 hover:bg-cyan-600 px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all">View Asset</a>
                    </td>
                 </tr>
               ))}
            </tbody>
           </table>
        </section>
      ) : (
        <section className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-10 sm:p-20 text-center space-y-10 animate-up">
          <div className="max-w-2xl mx-auto space-y-6">
             <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center mx-auto text-orange-400 mb-8">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2}/></svg>
             </div>
             <h3 className="text-2xl font-black font-orbitron text-white uppercase">Kenapa Tak Boleh Save ke GitHub?</h3>
             <p className="text-sm text-slate-400 leading-relaxed">
                GitHub adalah platform untuk menyimpan **KOD (Blueprints)**, bukannya **DATA (Residents)**. Apabila anda "save" sesuatu dalam aplikasi, ia disimpan dalam Supabase (Cloud Database).
             </p>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mt-10">
                <div className="p-6 bg-black/40 border border-white/5 rounded-2xl">
                   <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">Simpan Kod (GitHub)</h4>
                   <p className="text-[10px] text-slate-500">Anda perlu muat turun fail .zip kod ini dan muat naik secara manual ke repository GitHub anda.</p>
                </div>
                <div className="p-6 bg-black/40 border border-white/5 rounded-2xl">
                   <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Simpan Data (Supabase)</h4>
                   <p className="text-[10px] text-slate-500">Semua user dan video anda sudah automatik disimpan di cloud. Ia tidak akan hilang walaupun anda tutup browser.</p>
                </div>
             </div>

             <div className="pt-10">
                <button 
                   onClick={() => window.open('https://github.com/new', '_blank')}
                   className="bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-orange-900/20"
                >
                   Buka GitHub & Cipta Repo Baru
                </button>
             </div>
          </div>
        </section>
      )}
    </div>
  );
};
