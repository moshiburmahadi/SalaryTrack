import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { 
  Award, 
  Loader2, 
  Settings,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Database,
  Terminal,
  Zap,
  Activity,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

type Shift = 'morning' | 'evening' | 'night';

export default function AdminKPISet() {
  const [activeShift, setActiveShift] = useState<Shift>('morning');
  const [configs, setConfigs] = useState<Record<Shift, { A: number; B: number; C: number }>>({
    morning: { A: 3000, B: 2000, C: 1000 },
    evening: { A: 3000, B: 2000, C: 1000 },
    night: { A: 3000, B: 2000, C: 1000 }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'config', 'kpi_bonuses_by_shift');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfigs(docSnap.data() as any);
        }

        const userSnap = await getDocs(collection(db, 'users'));
        setUserCount(userSnap.size);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdate = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      await setDoc(doc(db, 'config', 'kpi_bonuses_by_shift'), configs);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const updateAmount = (shift: Shift, grade: 'A' | 'B' | 'C', val: number) => {
    setConfigs(prev => ({
      ...prev,
      [shift]: {
        ...prev[shift],
        [grade]: val
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-gold-accent" />
        <p className="text-[10px] mono uppercase tracking-[0.3em] animate-cyber-flicker">Retrieving Shift Configuration...</p>
      </div>
    );
  }

  const shifts: { id: Shift; label: string; icon: any; color: string; desc: string }[] = [
    { id: 'morning', label: 'MORNING_NODES', icon: Sun, color: 'text-orange-400', desc: 'Sector ALPHA :: 0600 - 1400' },
    { id: 'evening', label: 'EVENING_NODES', icon: Sunset, color: 'text-blue-400', desc: 'Sector BETA :: 1400 - 2200' },
    { id: 'night', label: 'NIGHT_NODES', icon: Moon, color: 'text-purple-400', desc: 'Sector GAMMA :: 2200 - 0600' }
  ];

  return (
    <div className="space-y-10 relative">
      <div className="fixed inset-0 cyber-grid pointer-events-none opacity-10 z-0" />

      <div className="flex items-center gap-4 relative z-10">
        <div className="w-14 h-14 cyber-panel flex items-center justify-center text-gold-accent hud-corner">
          <Settings className="w-7 h-7" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl mono font-black text-white tracking-widest uppercase italic">KPI Variable Tuning</h1>
            <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-[8px] mono font-bold text-blue-400 rounded-sm italic animate-cyber-flicker">
              PARAM_WRITE_ENABLED
            </span>
          </div>
          <p className="text-[10px] mono uppercase tracking-[0.2em] text-stone-500 font-bold mt-1">
            Global Reward Matrix | Shift-Based Modulation | Grade Weighting
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
        {/* Shift Selection Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          {shifts.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveShift(s.id)}
              className={cn(
                "w-full text-left p-5 cyber-panel hud-corner transition-all group overflow-hidden",
                activeShift === s.id 
                  ? "border-gold-accent bg-gold-accent/[0.08]" 
                  : "border-border-dark grayscale hover:grayscale-0 hover:border-stone-700"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-sm bg-black/40 border border-border-dark", activeShift === s.id ? "border-gold-accent/40" : "")}>
                  <s.icon className={cn("w-5 h-5", activeShift === s.id ? "text-gold-accent" : s.color)} />
                </div>
                <div>
                  <span className="text-[10px] mono font-black text-white block tracking-widest uppercase">{s.label}</span>
                  <span className="text-[8px] mono text-stone-500 uppercase">{s.desc}</span>
                </div>
              </div>
              {activeShift === s.id && (
                <motion.div 
                  layoutId="active-marker"
                  className="absolute right-0 top-0 bottom-0 w-1 bg-gold-accent shadow-[0_0_10px_rgba(197,160,89,0.5)]"
                />
              )}
            </button>
          ))}
          
          <div className="p-6 border border-dashed border-stone-800 rounded-sm bg-black/20 mt-6">
            <p className="text-[9px] mono text-stone-600 uppercase leading-relaxed font-bold tracking-tighter italic">
              // WARNING: Modulation values directly correlate to monthly disbursement totals. Use extreme caution during overwrite.
            </p>
          </div>
        </div>

        {/* Amount Configuration */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeShift}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="cyber-panel p-10 hud-corner shadow-2xl space-y-10"
            >
              <div className="flex items-center justify-between border-b border-border-dark pb-8">
                <div className="flex items-center gap-4">
                  <Terminal className="w-5 h-5 text-gold-accent animate-cyber-flicker" />
                  <h2 className="text-sm mono font-black uppercase tracking-[0.3em] text-white italic">
                    {activeShift.toUpperCase()}_BASE_MATRIX_PARAMS
                  </h2>
                </div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-gold-accent animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-gold-accent/20" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {(['A', 'B', 'C'] as const).map((grade) => (
                  <div key={grade} className="space-y-5 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 cyber-panel flex items-center justify-center text-sm font-black text-gold-accent group-hover:scale-110 transition-transform">
                          {grade}
                        </div>
                        <label className="text-[10px] mono uppercase tracking-widest text-stone-500 font-black">Grade_{grade}_Bonus</label>
                      </div>
                      <span className="text-[8px] mono text-stone-700 font-bold uppercase italic">[৳_CURRENCY]</span>
                    </div>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-stone-800 mono text-xs font-black">VAL:</div>
                      <input 
                        type="number" 
                        value={configs[activeShift][grade]}
                        onChange={(e) => updateAmount(activeShift, grade, parseInt(e.target.value) || 0)}
                        className="w-full bg-black/60 border border-border-dark p-6 pl-14 rounded-sm text-2xl mono font-black text-white focus:border-gold-accent outline-none transition-all placeholder:text-stone-900 group-hover:border-gold-accent/30 italic"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-10 border-t border-border-dark flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3 bg-black/40 px-4 py-2 border border-border-dark rounded-sm">
                  <Activity className="w-3 h-3 text-gold-accent" />
                  <p className="text-[9px] mono text-stone-500 uppercase font-black italic">
                    Runtime Integrity: [STABLE]
                  </p>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                  {saveStatus === 'success' && (
                    <motion.p 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-cyber-green mono text-[10px] font-black uppercase tracking-widest animate-cyber-flicker"
                    >
                      SYNC_COMPLETE
                    </motion.p>
                  )}
                  {saveStatus === 'error' && (
                    <motion.p 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-red-500 mono text-[10px] font-black uppercase tracking-widest"
                    >
                      WRITE_FAILED
                    </motion.p>
                  )}
                  
                  <button
                    onClick={handleUpdate}
                    disabled={saving}
                    className="flex-1 md:flex-none cyber-panel bg-gold-accent text-black px-12 py-5 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-gold-accent/90 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(197,160,89,0.15)] group relative"
                  >
                    <div className="absolute top-0 right-0 w-12 h-[1px] bg-white opacity-20" />
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    OVERWRITE_{activeShift.toUpperCase()}_LOG
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center gap-3 px-4 py-3 bg-stone-950/40 border-l-2 border-gold-accent/40 rounded-r-sm">
            <Cpu className="w-4 h-4 text-stone-700" />
            <p className="text-[9px] mono uppercase tracking-[0.2em] text-stone-600 font-black italic leading-relaxed">
              * WARNING: This modulation will recalibrate net compensation for all {userCount} active nodes assigned to shift sector {activeShift.toUpperCase()}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
