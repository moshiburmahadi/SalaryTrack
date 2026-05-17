import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FileSpreadsheet, Save, Loader2, Info, Database, Link, Calendar, Globe, Terminal, Cpu, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminRosterConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [agentConfig, setAgentConfig] = useState({ 
    sheetUrl: '', 
    agentSheetName: '', 
    tlRosterUrl: '', 
    month: new Date().toISOString().slice(0, 7) 
  });
  const [qaConfig, setQaConfig] = useState({ sheetUrl: '', sheetName: '', month: new Date().toISOString().slice(0, 7) });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const agentSnap = await getDoc(doc(db, 'configs', 'roster_agent_tl'));
        if (agentSnap.exists()) {
          const data = agentSnap.data();
          setAgentConfig({
            sheetUrl: data.sheetUrl || '',
            agentSheetName: data.agentSheetName || '',
            tlRosterUrl: data.tlRosterUrl || data.tlSheetName || '', // Fallback for migration
            month: data.month || new Date().toISOString().slice(0, 7)
          });
        }
        const qaSnap = await getDoc(doc(db, 'configs', 'roster_qa'));
        if (qaSnap.exists()) {
          setQaConfig(qaSnap.data() as any);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, 'configs', 'roster_agent_tl'), {
        ...agentConfig,
        updatedAt: serverTimestamp()
      });
      setMessage({ type: 'success', text: 'SYNC_PROTOCOL::AGENT_TL_SUCCESS' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'SYNC_ERROR::WRITE_ABORTED' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQA = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, 'configs', 'roster_qa'), {
        ...qaConfig,
        updatedAt: serverTimestamp()
      });
      setMessage({ type: 'success', text: 'SYNC_PROTOCOL::QA_SUCCESS' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'SYNC_ERROR::WRITE_ABORTED' });
    } finally {
      setSaving(false);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + (i - 6));
    return d.toISOString().slice(0, 7);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-gold-accent" />
        <p className="text-[10px] mono uppercase tracking-[0.3em] animate-cyber-flicker">Pulling Remote Buffers...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 relative">
      <div className="fixed inset-0 cyber-grid pointer-events-none opacity-10 z-0" />

      <div className="flex items-center gap-4 mb-8 relative z-10">
        <div className="w-14 h-14 cyber-panel flex items-center justify-center text-gold-accent hud-corner">
          <Globe className="w-7 h-7" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl mono font-black text-white tracking-widest uppercase italic">External_Logic_Sync</h1>
            <div className="w-3 h-3 rounded-full bg-gold-accent/20 animate-pulse" />
          </div>
          <p className="text-[10px] mono uppercase tracking-[0.2em] text-stone-500 font-bold mt-1">
            Data Extraction Middleware | Sheet-to-Node Synchronization
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Agent & TL Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cyber-panel p-10 hud-corner shadow-2xl space-y-8"
        >
          <div className="flex items-center gap-3 border-b border-border-dark pb-6 mb-2">
            <Terminal className="w-4 h-4 text-gold-accent" />
            <h3 className="text-xl mono font-black text-white uppercase tracking-wider italic">AGENT_CELL_OVERRIDE</h3>
          </div>
          
          <form onSubmit={handleSaveAgent} className="space-y-6 relative z-10">
            <div>
              <label className="text-[10px] mono uppercase tracking-widest text-stone-500 font-black block mb-2 px-1">Remote_Master_URL</label>
              <div className="relative">
                <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-700" />
                <input 
                  type="url"
                  required
                  placeholder="https://docs.google.com/spreadsheets/..."
                  className="w-full bg-black/60 border border-border-dark rounded-sm pl-12 pr-4 py-4 text-white text-xs mono focus:border-gold-accent outline-none font-medium italic transition-all"
                  value={agentConfig.sheetUrl}
                  onChange={(e) => setAgentConfig({ ...agentConfig, sheetUrl: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] mono uppercase tracking-widest text-stone-500 font-black block mb-2 px-1">Sector_Timestamp</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-700 pointer-events-none" />
                  <select 
                    value={agentConfig.month}
                    onChange={(e) => setAgentConfig({ ...agentConfig, month: e.target.value })}
                    className="w-full bg-black/60 border border-border-dark rounded-sm pl-12 pr-4 py-4 text-white text-xs mono focus:border-gold-accent outline-none appearance-none font-black italic"
                  >
                    {months.map(m => (
                      <option key={m} value={m}>{m.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] mono uppercase tracking-widest text-stone-500 font-black block mb-2 px-1">Sheet_Tab_PID</label>
                <input 
                  type="text"
                  required
                  placeholder="Sheet1"
                  className="w-full bg-black/60 border border-border-dark rounded-sm px-5 py-4 text-white text-xs mono focus:border-gold-accent outline-none font-black uppercase italic"
                  value={agentConfig.agentSheetName}
                  onChange={(e) => setAgentConfig({ ...agentConfig, agentSheetName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] mono uppercase tracking-widest text-gold-accent/60 font-black block mb-2 px-1">TL_UPLINK_DIRECT_ACCESS</label>
              <div className="relative">
                <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-accent/40" />
                <input 
                  type="url"
                  required
                  placeholder="https://..."
                  className="w-full bg-black/60 border border-border-dark rounded-sm pl-12 pr-4 py-4 text-white text-xs mono focus:border-gold-accent outline-none font-medium italic transition-all border-gold-accent/20"
                  value={agentConfig.tlRosterUrl}
                  onChange={(e) => setAgentConfig({ ...agentConfig, tlRosterUrl: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" disabled={saving} className="w-full cyber-panel bg-gold-accent text-black text-[10px] mono font-black py-5 rounded-sm hover:opacity-90 flex items-center justify-center gap-3 transition-all uppercase tracking-widest shadow-xl shadow-gold-accent/5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              PUSH_REMOTE_SYNC
            </button>
          </form>
        </motion.div>

        {/* QA Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="cyber-panel p-10 hud-corner shadow-2xl space-y-8"
        >
          <div className="flex items-center gap-3 border-b border-border-dark pb-6 mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-premium" />
            <h3 className="text-xl mono font-black text-white uppercase tracking-wider italic">QA_VAL_PROTOCOL</h3>
          </div>
          
          <form onSubmit={handleSaveQA} className="space-y-6 relative z-10">
            <div>
              <label className="text-[10px] mono uppercase tracking-widest text-stone-500 font-black block mb-2 px-1">Validator_Sheet_Link</label>
              <div className="relative">
                <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-700" />
                <input 
                  type="url"
                  required
                  placeholder="https://docs.google.com/spreadsheets/..."
                  className="w-full bg-black/60 border border-border-dark rounded-sm pl-12 pr-4 py-4 text-white text-xs mono focus:border-purple-premium outline-none font-medium italic transition-all"
                  value={qaConfig.sheetUrl}
                  onChange={(e) => setQaConfig({ ...qaConfig, sheetUrl: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] mono uppercase tracking-widest text-stone-500 font-black block mb-2 px-1">Sync_Month_PID</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-700 pointer-events-none" />
                  <select 
                    value={qaConfig.month}
                    onChange={(e) => setQaConfig({ ...qaConfig, month: e.target.value })}
                    className="w-full bg-black/60 border border-border-dark rounded-sm pl-12 pr-4 py-4 text-white text-xs mono focus:border-purple-premium outline-none appearance-none font-black italic"
                  >
                    {months.map(m => (
                      <option key={m} value={m}>{m.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] mono uppercase tracking-widest text-stone-500 font-black block mb-2 px-1">Tab_Buffer_ID</label>
                <input 
                  type="text"
                  required
                  placeholder="QA_ROSTER"
                  className="w-full bg-black/60 border border-border-dark rounded-sm px-5 py-4 text-white text-xs mono focus:border-purple-premium outline-none font-black uppercase italic"
                  value={qaConfig.sheetName}
                  onChange={(e) => setQaConfig({ ...qaConfig, sheetName: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" disabled={saving} className="w-full cyber-panel bg-stone-900 border-purple-premium/30 text-purple-premium text-[10px] mono font-black py-5 rounded-sm hover:bg-purple-premium/10 flex items-center justify-center gap-3 transition-all uppercase tracking-widest">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              INITIATE_QA_SYNC
            </button>
          </form>
        </motion.div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className={`cyber-panel p-6 border-2 mono text-[10px] font-black uppercase tracking-[0.4em] text-center shadow-2xl relative z-20 ${message.type === 'success' ? 'border-cyber-green/50 text-cyber-green' : 'border-red-500/50 text-red-500'}`}
          >
            <div className="absolute top-0 left-0 w-8 h-[2px] bg-white opacity-40" />
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="cyber-panel p-10 bg-blue-500/[0.03] border-blue-500/20 hud-corner relative z-10">
        <h4 className="text-[11px] mono uppercase tracking-[0.3em] font-black text-blue-400 mb-6 flex items-center gap-3 italic">
          <Info className="w-4 h-4 animate-cyber-flicker" />
          SYSTEM_INTEGRATION_GUIDE
        </h4>
        <ul className="space-y-4 text-[10px] mono font-bold text-stone-500 uppercase tracking-widest">
          <li className="flex items-start gap-4">
            <span className="text-blue-500 opacity-40 font-black italic">[01]</span>
            <span>Link remote Google Sheets repository with "Public Readable" permissions.</span>
          </li>
          <li className="flex items-start gap-4">
            <span className="text-blue-500 opacity-40 font-black italic">[02]</span>
            <span>Ensure username alignment between Cloud Storage and Registry Nodes.</span>
          </li>
          <li className="flex items-start gap-4">
            <span className="text-blue-500 opacity-40 font-black italic">[03]</span>
            <span>Valid shift mapping characters recognized: [M]orning, [E]vening, [N]ight, [G]eneral, etc.</span>
          </li>
          <li className="flex items-start gap-4">
            <span className="text-blue-500 opacity-40 font-black italic">[04]</span>
            <span>AI middleware will automatically sync buffers every 600s or on direct manual pull.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
