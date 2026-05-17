import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  Timestamp,
  query,
  where
} from 'firebase/firestore';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Settings, 
  Loader2, 
  Award,
  Eye,
  ArrowRight,
  Terminal,
  Cpu,
  Fingerprint,
  ShieldAlert,
  Binary
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { subMinutes } from 'date-fns';

interface AdminDashboardProps {
  onViewUser: (userId: string) => void;
}

export default function AdminDashboard({ onViewUser }: AdminDashboardProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Fetch all required data in parallel
        const [kpiDoc, userSnap, salarySnap, attendanceSnap, kpiSnap] = await Promise.all([
          getDoc(doc(db, 'config', 'kpi_bonuses_by_shift')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'salary_settings')),
          getDocs(query(collection(db, 'attendance'), where('month', '==', currentMonth))),
          getDocs(query(collection(db, 'kpi'), where('month', '==', currentMonth)))
        ]);

        const kpiShiftConfig = kpiDoc.exists() ? kpiDoc.data() : {
          morning: { A: 3000, B: 2000, C: 1000 },
          evening: { A: 3000, B: 2000, C: 1000 },
          night: { A: 3000, B: 2000, C: 1000 }
        };

        const allUsers = userSnap.docs
          .map(d => ({ id: d.id, uid: d.id, ...d.data() as any }))
          .filter((u: any) => !u.isBanned);
        const salaries = new Map(salarySnap.docs.map(d => [d.id, d.data().amount]));
        
        const attendanceMap = new Map();
        attendanceSnap.docs.forEach(d => {
          const data = d.data();
          if (!attendanceMap.has(data.userId)) attendanceMap.set(data.userId, []);
          attendanceMap.get(data.userId).push(data);
        });

        const userKpiMap = new Map(kpiSnap.docs.map(d => [d.data().userId, d.data().grade]));
        const userShiftMap = new Map(kpiSnap.docs.map(d => [d.data().userId, d.data().shift]));

        const usersWithSalary = allUsers.map((u: any) => {
          const dailyRate = salaries.get(u.id) || 0;
          const userAtt = attendanceMap.get(u.id) || [];
          const presentDays = userAtt.filter((a: any) => a.status === 'present' || a.status === 'ot').length;
          const otDays = userAtt.filter((a: any) => a.status === 'ot').length;
          
          const grade = userKpiMap.get(u.id);
          const shift = userShiftMap.get(u.id) as 'morning' | 'evening' | 'night' | undefined;
          
          let bonus = 0;
          if (grade && shift && kpiShiftConfig[shift]) {
            bonus = kpiShiftConfig[shift][grade] || 0;
          }

          const net = (presentDays * dailyRate) + (otDays * dailyRate) + bonus;
          
          // Determine activity status for sorting
          const fiveMinsAgo = subMinutes(new Date(), 5);
          const isActive = u.active === true && (u.lastSeen?.toDate() || 0) > fiveMinsAgo;
          
          return { ...u, netSalary: net, activeNow: isActive, currentMonth };
        });

        // Sort: Active users first, then by name
        const sortedUsers = usersWithSalary.sort((a, b) => {
          if (a.activeNow && !b.activeNow) return -1;
          if (!a.activeNow && b.activeNow) return 1;
          return (a.name || a.username).localeCompare(b.name || b.username);
        });

        setUsers(sortedUsers);
        
        // Stats
        const activeCount = usersWithSalary.filter((u: any) => u.activeNow).length;

        setStats({
          total: usersWithSalary.length,
          active: activeCount
        });

      } catch (err: any) {
        console.error("Admin dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-gold-accent" />
        <p className="text-[10px] mono uppercase tracking-[0.3em] animate-cyber-flicker">Decoding System Core...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 relative">
      {/* Background Grid for Admin Panel only */}
      <div className="fixed inset-0 cyber-grid pointer-events-none opacity-20 z-0" />
      
      {/* Overlay Scanline */}
      <div className="fixed top-0 left-0 w-full h-[6px] bg-red-500/20 z-[60] pointer-events-none animate-scanline shadow-[0_0_20px_rgba(239,68,68,0.4)]" />

      {/* Cyber Scanning HUD Elements */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden opacity-30">
        {/* Scanning Text Overlay */}
        <div className="absolute top-24 left-10 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-red-500 animate-pulse" />
            <span className="mono text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Live_System_Scan::Active</span>
          </div>
          <div className="w-48 h-1 bg-stone-900 overflow-hidden">
            <motion.div 
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-1/2 h-full bg-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.6)]"
            />
          </div>
        </div>
        {/* Corner HUD Markers */}
        <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-green-500/40 hud-corner" />
        <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-green-500/40 hud-corner-tr" />
        <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-green-500/40 hud-corner-bl" />
        <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-green-500/40 hud-corner-br" />

        {/* Floating Data Bits */}
        <motion.div 
          animate={{ y: [0, -100], opacity: [0, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute right-[15%] top-1/2 mono text-[8px] text-green-500/60 flex flex-col gap-1"
        >
          <span>SEQ_7732_ACK</span>
          <span>LATENCY::0.4ms</span>
          <span>SYSCALL_INT_80</span>
        </motion.div>

        <motion.div 
          animate={{ y: [100, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 1 }}
          className="absolute left-[10%] bottom-[20%] mono text-[8px] text-red-500/60 flex flex-col gap-1"
        >
          <span>ENCR_NODE_LINK</span>
          <span>PORT_TCP_443</span>
          <span>HANDSHAKE_READY</span>
        </motion.div>

        {/* Global Scanning Line (Vertical) */}
        <motion.div
          animate={{ x: ['10%', '90%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-green-500/40 to-transparent shadow-[0_0_15px_rgba(34,197,94,0.3)]"
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-14 h-14 cyber-panel flex items-center justify-center text-gold-accent hud-corner">
          <Terminal className="w-7 h-7" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl mono font-black text-white tracking-widest uppercase italic">Central Command</h1>
            <span className="px-2 py-0.5 bg-gold-accent/10 border border-gold-accent/30 text-[8px] mono font-bold text-gold-accent rounded-sm animate-cyber-flicker">
              SECURE_ACCESS_GRANTED
            </span>
          </div>
          <p className="text-[10px] mono uppercase tracking-[0.2em] text-stone-500 font-bold mt-1">
            System Overseer | Admin Privileges Active | Log Level: [DEBUG]
          </p>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cyber-panel p-8 hud-corner group hover:border-gold-accent/40 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3 h-3 text-stone-500" />
                <p className="text-[10px] mono uppercase tracking-widest text-stone-500 font-bold">Node Registry</p>
              </div>
              <h2 className="text-6xl mono text-white font-black group-hover:text-gold-accent transition-colors">
                {stats.total.toString().padStart(3, '0')}
              </h2>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-accent/40" />
                <span className="text-[8px] mono text-stone-600 uppercase">System wide active nodes monitored</span>
              </div>
            </div>
            <div className="p-4 bg-gold-accent/5 border border-gold-accent/20 rounded-full group-hover:rotate-12 transition-transform">
              <Cpu className="w-8 h-8 text-gold-accent" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="cyber-panel p-8 hud-corner group hover:border-blue-500/40 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3 h-3 text-stone-500" />
                <p className="text-[10px] mono uppercase tracking-widest text-stone-500 font-bold">Live Connections</p>
              </div>
              <div className="flex items-end gap-3">
                <h2 className="text-6xl mono text-blue-500 font-black group-hover:text-blue-400 transition-colors italic">
                  {stats.active.toString().padStart(2, '0')}
                </h2>
                <div className="mb-2 w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                <span className="text-[8px] mono text-stone-600 uppercase">Real-time sync packets heartbeat active</span>
              </div>
            </div>
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-full group-hover:scale-110 transition-transform">
              <Binary className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* User Performance List */}
      <div className="space-y-6 relative z-10">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 bg-gold-accent/40" />
            <h3 className="text-[11px] mono uppercase tracking-[0.3em] font-black text-white">Grid_Interface_V2.0.1</h3>
          </div>
          <span className="text-[9px] mono text-stone-600 uppercase">[Filter: All_Active_Nodes]</span>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {users.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="cyber-panel flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-gold-accent/[0.03] hover:border-gold-accent/30 transition-all group gap-6 md:gap-0"
            >
              {/* Month at the start */}
              <div className="w-full md:w-40 border-b md:border-b-0 border-border-dark pb-4 md:pb-0">
                <span className="text-[9px] mono uppercase tracking-widest text-stone-600 font-bold block mb-1">Time_Period::UID</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs mono font-black text-white">{u.currentMonth}</span>
                  <span className="text-[10px] mono text-stone-700 italic">[{u.id.slice(0, 8)}]</span>
                </div>
              </div>

              {/* Username in the middle */}
              <div className="flex-1 flex flex-col items-start md:items-center justify-center">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-3 h-3 text-stone-700 group-hover:text-gold-accent transition-colors" />
                  <h4 className="text-white mono font-black tracking-[0.2em] uppercase text-base group-hover:text-gold-accent transition-all group-hover:scale-105 origin-left">
                    {u.username || 'ANON_NODE'}
                  </h4>
                  {u.activeNow && (
                    <span className="px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 text-[7px] mono font-bold text-green-500 animate-pulse uppercase">
                      ONLINE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 px-6">
                  <div className="w-1 h-2 bg-stone-800" />
                  <span className="text-[10px] mono uppercase tracking-widest text-stone-500">{u.name}</span>
                </div>
              </div>
              
              {/* Salary Indicator */}
              <div className="flex flex-row md:items-center justify-between md:justify-end gap-6 md:gap-12 border-t md:border-t-0 border-border-dark pt-4 md:pt-0">
                <div className="flex flex-col items-start md:items-end">
                  <p className="text-[9px] mono uppercase tracking-widest text-stone-600 mb-1 leading-none font-bold">Net_Compensation</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl mono font-black text-white italic group-hover:text-gold-accent transition-colors tracking-tighter">
                      {formatCurrency(u.netSalary)}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => onViewUser(u.id)}
                  className="flex items-center gap-2 px-8 py-4 bg-stone-950 border border-border-dark text-[9px] mono uppercase tracking-[0.2em] font-black text-stone-600 hover:border-gold-accent hover:text-gold-accent transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gold-accent/20" />
                  <Eye className="w-3 h-3" />
                  Access_Log
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
