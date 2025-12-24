
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/supabaseService';

interface AdminDashboardProps {
  currentUser: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await db.getAllUsers();
      if (data) setUsers(data);
    } catch (e) {
      console.error("Gagal ambil senarai user:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStatus = async (username: string, currentData: any, newStatus: User['status']) => {
    const updatedData = { ...currentData, status: newStatus };
    // Jika approve kali pertama, bagi 5 limit video
    if (newStatus === 'approved' && (!updatedData.videoLimit || updatedData.videoLimit === 0)) {
      updatedData.videoLimit = 5;
    }
    await db.updateUser(username, updatedData);
    fetchUsers();
  };

  const handleUpdateLimit = async (username: string, currentData: any, newLimit: number) => {
    const updatedData = { ...currentData, videoLimit: newLimit };
    await db.updateUser(username, updatedData);
    fetchUsers();
  };

  const filteredUsers = users.filter(u => u.data.status === activeTab && u.username !== 'azmeerbisnes1');

  if (currentUser.role !== 'admin') {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="glass-panel p-10 rounded-3xl border border-red-500/20 text-center">
          <p className="text-red-500 font-black uppercase tracking-widest mb-2">Akses Ditolak</p>
          <p className="text-slate-500 text-xs">Hanya Admin Azmeer sahaja boleh masuk sini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#020617] p-6 md:p-12 overflow-y-auto custom-scrollbar animate-up">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-12 space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_12px_cyan]"></div>
             <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.5em]">Dashboard Kawalan Admin</p>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
            Urus <span className="text-slate-800">Pengguna</span>
          </h2>
        </header>

        {/* Tabs Pengurusan */}
        <div className="flex flex-wrap gap-3 mb-10 p-2 bg-white/5 w-fit rounded-2xl border border-white/5">
           <button 
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
           >
             Menunggu Kelulusan ({users.filter(u => u.data.status === 'pending').length})
           </button>
           <button 
            onClick={() => setActiveTab('approved')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'approved' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
           >
             Ahli Aktif ({users.filter(u => u.data.status === 'approved' && u.username !== 'azmeerbisnes1').length})
           </button>
           <button 
            onClick={() => setActiveTab('rejected')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'rejected' ? 'bg-red-900/40 text-red-400 border border-red-500/20 shadow-lg' : 'text-slate-500 hover:text-white'}`}
           >
             Ditolak/Banned ({users.filter(u => u.data.status === 'rejected').length})
           </button>
        </div>

        {loading ? (
          <div className="py-40 text-center">
             <div className="w-10 h-10 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin mx-auto mb-6"></div>
             <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sedang memuatkan data ahli...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-40 text-center border-2 border-dashed border-slate-900 rounded-[3rem] bg-slate-900/10">
             <p className="text-slate-700 font-black uppercase tracking-[0.3em] text-[10px]">Tiada rekod buat masa sekarang.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((u) => (
              <div key={u.username} className="glass-panel p-6 md:p-8 rounded-[2rem] border border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-white/10 transition-all">
                <div className="flex items-start gap-6 flex-1 min-w-0">
                   <div className="relative">
                      <img src={u.data.picture} className="w-16 h-16 rounded-2xl border border-white/10 bg-slate-950 flex-none" alt="Avatar" />
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${u.data.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                   </div>
                   <div className="space-y-3 min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-black text-white uppercase truncate">{u.data.name || u.username}</h4>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded bg-white/5 text-slate-500 border border-white/10 uppercase tracking-tighter">USER_ID: {u.username}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                           <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Alamat Emel</p>
                           <p className="text-[10px] font-mono text-cyan-400 truncate">{u.data.email}</p>
                        </div>
                        <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                           <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Kata Laluan (PWD)</p>
                           <p className="text-[10px] font-mono text-purple-400 truncate">{u.data.password || 'N/A'}</p>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 lg:border-l lg:border-white/5 lg:pl-8">
                   {u.data.status === 'approved' && (
                     <div className="flex flex-col items-center gap-2">
                        <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Limit Video Sora 2</label>
                        <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5">
                           <button onClick={() => handleUpdateLimit(u.username, u.data, Math.max(0, (u.data.videoLimit || 0) - 1))} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-red-500/20 text-slate-400 transition-all font-bold">-</button>
                           <span className="text-xl font-black font-orbitron text-white min-w-[30px] text-center">{u.data.videoLimit || 0}</span>
                           <button onClick={() => handleUpdateLimit(u.username, u.data, (u.data.videoLimit || 0) + 1)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-cyan-500/20 text-slate-400 transition-all font-bold">+</button>
                        </div>
                     </div>
                   )}

                   <div className="flex gap-2 w-full md:w-auto">
                      {u.data.status === 'pending' ? (
                        <>
                          <button onClick={() => handleUpdateStatus(u.username, u.data, 'approved')} className="flex-1 md:w-32 py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded-2xl transition-all shadow-lg shadow-emerald-900/20">Luluskan</button>
                          <button onClick={() => handleUpdateStatus(u.username, u.data, 'rejected')} className="flex-1 md:w-32 py-4 bg-red-600/10 border border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white text-[10px] font-black uppercase rounded-2xl transition-all">Tolak</button>
                        </>
                      ) : u.data.status === 'approved' ? (
                        <button onClick={() => handleUpdateStatus(u.username, u.data, 'rejected')} className="w-full md:w-32 py-4 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white text-[10px] font-black uppercase rounded-2xl transition-all">Ban User</button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(u.username, u.data, 'pending')} className="w-full md:w-32 py-4 bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white text-[10px] font-black uppercase rounded-2xl transition-all">Review Semula</button>
                      )}
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
