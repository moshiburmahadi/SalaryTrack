import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { 
  Users, 
  MoreVertical, 
  AlertTriangle, 
  Slash, 
  Loader2,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Key,
  ShieldAlert,
  Database,
  Unplug,
  Zap,
  Terminal,
  Cpu,
  Binary,
  Activity,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [viewingPassword, setViewingPassword] = useState<{id: string, username: string, pass: string} | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRank, setEditRank] = useState<'Agent' | 'QA' | 'TL'>('Agent');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const userSnap = await getDocs(collection(db, 'users'));
      const allUsers = userSnap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() as any }));
      setUsers(allUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditUsername(user.username || '');
    setEditRank(user.rank || 'Agent');
    setActiveMenu(null);
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        name: editName.trim(),
        username: editUsername.trim().toUpperCase(),
        rank: editRank
      });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAction = async (userId: string, action: 'warn' | 'ban' | 'pardon' | 'verify') => {
    try {
      const userRef = doc(db, 'users', userId);
      if (action === 'warn') {
        const warningMsg = 'Please use a valid username. According to your username and full name, you have been identified as a fake user. Therefore, your account will be banned within 24 hours.';
        await updateDoc(userRef, {
          warning: warningMsg,
          warningSeen: false,
          warningTimestamp: Date.now()
        });
      } else if (action === 'ban') {
        await updateDoc(userRef, {
          isBanned: true,
          active: false // Also kick out
        });
      } else if (action === 'pardon') {
        await updateDoc(userRef, {
          isBanned: false,
          warning: null,
          warningSeen: true,
          warningTimestamp: null
        });
      } else if (action === 'verify') {
        const currentUser = users.find(u => u.id === userId);
        await updateDoc(userRef, {
          verified: !currentUser?.verified
        });
      }
      fetchUsers();
      setActiveMenu(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-gold-accent" />
        <p className="text-[10px] mono uppercase tracking-[0.3em] animate-cyber-flicker">Accessing Directory Base...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 relative">
      {/* Background Grid */}
      <div className="fixed inset-0 cyber-grid pointer-events-none opacity-10 z-0" />

      {/* Header */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-14 h-14 cyber-panel flex items-center justify-center text-gold-accent hud-corner">
          <Database className="w-7 h-7" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl mono font-black text-white tracking-widest uppercase italic">Node Administration</h1>
            <div className="flex gap-1">
              <span className="w-1 h-3 bg-gold-accent/40" />
              <span className="w-1 h-3 bg-gold-accent/20" />
            </div>
          </div>
          <p className="text-[10px] mono uppercase tracking-[0.2em] text-stone-500 font-bold mt-1">
            Directory Management | Threat Neutralization | ID Synchronization
          </p>
        </div>
      </div>

      <div className="cyber-panel overflow-hidden relative z-10 hud-corner">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-dark bg-black/60">
                <th className="px-8 py-5 text-[10px] mono uppercase tracking-widest text-stone-500 font-bold">Node_Identifier</th>
                <th className="px-8 py-5 text-[10px] mono uppercase tracking-widest text-stone-500 font-bold text-center">Protocol_Status</th>
                <th className="px-8 py-5 text-[10px] mono uppercase tracking-widest text-stone-500 font-bold text-right">Overrides</th>
              </tr>
            </thead>
            <tbody className="mono text-[11px]">
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border-dark/50 hover:bg-gold-accent/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-black text-sm tracking-[0.1em] uppercase group-hover:text-gold-accent transition-colors">
                          {user.username || 'ANON_ID'}
                        </span>
                        {user.verified && (
                          <div className="flex items-center gap-1 bg-purple-premium/10 border border-purple-premium/30 px-2 py-0.5 rounded-sm animate-premium-glow">
                            <ShieldCheck className="w-2.5 h-2.5 text-purple-premium" />
                            <span className="text-[8px] font-black text-purple-premium uppercase tracking-tighter">TRUSTED</span>
                          </div>
                        )}
                        {user.rank && (
                          <span className="px-2 py-0.5 bg-gold-accent/10 border border-gold-accent/30 text-[8px] uppercase font-black text-gold-accent rounded-sm">
                            LVL_{user.rank}
                          </span>
                        )}
                        {user.isAdmin && (
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-[8px] uppercase font-black text-red-500 rounded-sm italic">
                            ROOT_ADMIN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-stone-400 font-bold tracking-wider uppercase text-[9px]">{user.name}</span>
                        <span className="text-stone-700">::</span>
                        <span className="text-[8px] text-stone-600 tracking-tighter">UID_{user.uid.slice(0, 12)}...</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center">
                       {user.isBanned ? (
                         <div className="flex items-center gap-2 px-3 py-1 bg-red-950/20 text-red-500 border border-red-900/40 text-[9px] uppercase font-black rounded-sm shadow-[0_0_10px_rgba(239,68,68,0.15)]">
                           <ShieldAlert className="w-3 h-3" />
                           BLACKLISTED_NODE
                         </div>
                       ) : user.warning && !user.warningSeen ? (
                         <div className="flex items-center gap-2 px-3 py-1 bg-yellow-950/20 text-yellow-500 border border-yellow-900/40 text-[9px] uppercase font-black rounded-sm animate-cyber-flicker">
                           <AlertTriangle className="w-3 h-3" />
                           WARNING_ISSUED
                         </div>
                       ) : (
                         <div className="flex items-center gap-2 px-3 py-1 bg-cyber-green/5 text-cyber-green border border-cyber-green/20 text-[9px] uppercase font-black rounded-sm">
                           <Zap className="w-3 h-3" />
                           NODE_UPTIME_OK
                         </div>
                       )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right relative">
                    <button 
                      onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                      className="p-2.5 hover:bg-gold-accent/10 rounded-sm transition-all text-stone-600 hover:text-gold-accent border border-transparent hover:border-gold-accent/20"
                    >
                      <Terminal className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {activeMenu === user.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setActiveMenu(null)} 
                          />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.98, x: 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.98, x: 10 }}
                            className="absolute right-12 top-0 w-52 cyber-panel shadow-2xl z-50 p-1.5"
                          >
                            <div className="px-3 py-2 border-b border-border-dark mb-1">
                              <p className="text-[8px] mono text-stone-600 font-bold uppercase tracking-widest">Execute_Command_Node</p>
                            </div>
                            <button 
                              onClick={() => handleAction(user.id, 'pardon')}
                              className="w-full flex items-center gap-3 px-4 py-3 text-[9px] uppercase font-black text-cyber-green hover:bg-cyber-green/10 transition-colors text-left"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              WIPE_VIOLATIONS
                            </button>
                            <button 
                              onClick={() => handleAction(user.id, 'verify')}
                              className="w-full flex items-center gap-3 px-4 py-3 text-[9px] uppercase font-black text-purple-premium hover:bg-purple-premium/10 transition-colors text-left"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {user.verified ? 'REVOKE_TRUSTED' : 'ASSIGN_TRUSTED'}
                            </button>
                            <button 
                              onClick={() => {
                                setViewingPassword({ id: user.id, username: user.username, pass: user.password || 'Not Set' });
                                setNewPassword('');
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-[9px] uppercase font-black text-gold-accent hover:bg-gold-accent/10 transition-colors text-left"
                            >
                              <Key className="w-3 h-3" />
                              DECODE_CREDENTIALS
                            </button>
                            <button 
                              onClick={() => handleEdit(user)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-[9px] uppercase font-black text-blue-500 hover:bg-blue-500/10 transition-colors text-left"
                            >
                              <Users className="w-3 h-3" />
                              EDIT_REGISTRY
                            </button>
                            <button 
                              onClick={() => handleAction(user.id, 'warn')}
                              className="w-full flex items-center gap-3 px-4 py-3 text-[9px] uppercase font-black text-yellow-500 hover:bg-yellow-500/10 transition-colors text-left"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              ISSUE_WARNING
                            </button>
                            <button 
                              onClick={() => handleAction(user.id, 'ban')}
                              className="w-full flex items-center gap-3 px-4 py-3 text-[9px] uppercase font-black text-red-500 hover:bg-red-500/10 transition-colors text-left"
                            >
                              <Unplug className="w-3 h-3" />
                              CUT_CONNECTION
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md cyber-panel p-10 hud-corner shadow-[0_0_50px_rgba(0,0,0,0.5)] border-gold-accent/30"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gold-accent/10 flex items-center justify-center border border-gold-accent/30 rounded-sm">
                  <Cpu className="w-5 h-5 text-gold-accent" />
                </div>
                <div>
                  <h3 className="text-xl mono font-black text-white uppercase tracking-widest italic">Registry Update</h3>
                  <p className="text-[9px] mono text-stone-500 uppercase">Modifying data packets for ID: {editingUser.id.slice(0, 8)}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] mono uppercase tracking-widest text-stone-500 font-black block mb-2 px-1">Node_Username</label>
                  <input 
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-black/60 border border-border-dark rounded-sm px-5 py-4 text-white text-sm mono focus:border-gold-accent outline-none uppercase placeholder:text-stone-800 transition-all font-black italic"
                    placeholder="ENTER_NEW_UID"
                  />
                </div>
                <div>
                  <label className="text-[10px] mono uppercase tracking-widest text-stone-500 font-black block mb-2 px-1">Registry_Name</label>
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/60 border border-border-dark rounded-sm px-5 py-4 text-white text-sm mono focus:border-gold-accent outline-none placeholder:text-stone-800 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] mono uppercase tracking-widest text-stone-500 font-black block mb-2 px-1">Access_Level_Rank</label>
                  <div className="relative">
                    <select 
                      value={editRank}
                      onChange={(e) => setEditRank(e.target.value as any)}
                      className="w-full bg-black/60 border border-border-dark rounded-sm px-5 py-4 text-white text-sm mono focus:border-gold-accent outline-none appearance-none font-black italic"
                    >
                      <option value="Agent">LEVEL_AGENT</option>
                      <option value="QA">LEVEL_QA_EXPERT</option>
                      <option value="TL">LEVEL_TEAM_LEAD</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gold-accent">
                      <Zap className="w-3 h-3 fill-gold-accent" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-10">
                <button 
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-6 py-4 border border-border-dark text-[10px] mono font-black text-stone-600 hover:text-white hover:border-white transition-all uppercase tracking-widest"
                >
                  Terminate
                </button>
                <button 
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 px-6 py-4 bg-gold-accent text-black text-[10px] mono font-black rounded-sm hover:bg-gold-accent/90 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  COMMIT_DATA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View/Change Password Modal */}
      <AnimatePresence>
        {viewingPassword && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => { if (!changingPass) setViewingPassword(null); }}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm cyber-panel p-10 hud-corner shadow-2xl border-purple-premium/30"
            >
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-18 h-18 bg-purple-premium/10 border border-purple-premium/30 rounded-full flex items-center justify-center mb-5 animate-premium-glow">
                  <Key className="w-8 h-8 text-purple-premium" />
                </div>
                <h3 className="text-xl mono font-black text-white mb-2 uppercase tracking-widest italic">Credential Decrypt</h3>
                <p className="text-[10px] mono uppercase tracking-widest text-stone-500 font-bold">Node_ID: {viewingPassword.username}</p>
              </div>
              
              <div className="p-8 bg-black/60 border-y border-border-dark mb-8 text-center relative group">
                <div className="absolute inset-0 bg-purple-premium/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-[10px] mono uppercase tracking-[0.2em] text-stone-600 font-black mb-3">Live_Security_Code</p>
                <div className="text-3xl mono text-purple-premium tracking-[0.3em] font-black break-all group-hover:scale-110 transition-transform">
                  {viewingPassword.pass}
                </div>
                {viewingPassword.pass === 'Not Set' && (
                  <p className="text-[9px] mono text-red-500/80 mt-4 leading-relaxed bg-red-950/10 p-3 border border-red-950/30 font-bold italic uppercase tracking-tighter">
                    ATTENTION: Legacy Node detected. Re-sync needed via User Login portal.
                  </p>
                )}
              </div>

              <div className="space-y-5 mb-10">
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] mono uppercase tracking-widest text-stone-500 font-black px-1">Overwrite_Payload</p>
                    <Binary className="w-3 h-3 text-stone-700" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="ENTER_NEW_BITS"
                    className="w-full px-5 py-4 bg-black/60 border border-border-dark rounded-sm text-white mono text-sm focus:border-purple-premium outline-none transition-all uppercase italic font-black"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <button 
                  onClick={async () => {
                    if (!newPassword.trim()) return;
                    setChangingPass(true);
                    try {
                      await updateDoc(doc(db, 'users', viewingPassword.id), {
                        password: newPassword.trim()
                      });
                      setViewingPassword(prev => prev ? { ...prev, pass: newPassword.trim() } : null);
                      setNewPassword('');
                      fetchUsers();
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setChangingPass(false);
                    }
                  }}
                  disabled={changingPass || !newPassword.trim()}
                  className="w-full py-4 bg-stone-950 border border-border-dark text-[10px] mono font-black text-stone-500 hover:text-purple-premium hover:border-purple-premium transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                  {changingPass ? <Loader2 className="w-4 h-4 animate-spin text-purple-premium" /> : <Zap className="w-4 h-4" />}
                  Injection_Update
                </button>
              </div>

              <button 
                onClick={() => setViewingPassword(null)}
                disabled={changingPass}
                className="w-full px-6 py-4 bg-white/5 border border-border-dark text-white text-[10px] mono font-black rounded-sm hover:bg-white/10 transition-all uppercase tracking-widest italic"
              >
                Close_Terminal
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
