import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Banknote, 
  CalendarCheck, 
  Target, 
  History,
  LogOut,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  Terminal,
  Cpu,
  Database,
  Search,
  Globe,
  Settings,
  Activity
} from 'lucide-react';
import { View } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: View;
  isAdminMode: boolean;
  rank?: string;
  setView: (view: View) => void;
}

const navItems: { id: View; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'roster', label: 'Roster', icon: FileSpreadsheet },
  { id: 'salary', label: 'Salary Amount', icon: Banknote },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'accuracy', label: 'Accuracy', icon: Target },
  { id: 'kpi', label: 'KPI Settings', icon: Banknote },
  { id: 'history', label: 'History', icon: History },
];

export default function Sidebar({ currentView, isAdminMode, rank, setView }: SidebarProps) {
  let dynamicItems = [...navItems];
  
  if (isAdminMode) {
    dynamicItems = [
      { id: 'admin', label: 'CORE_DASHBOARD', icon: LayoutDashboard },
      { id: 'user_management', label: 'NODE_REGISTRY', icon: Users },
      { id: 'verification_requests', label: 'IDENT_OVERSIGHT', icon: ShieldCheck },
      { id: 'admin_roster', label: 'LOGIC_UPLINK', icon: FileSpreadsheet },
      { id: 'dashboard', label: 'VIEW_AS_NODE', icon: Search },
      { id: 'kpi_amount_set', label: 'VARIABLE_TUNER', icon: Banknote },
    ];
  } else if (rank === 'TL') {
    dynamicItems = [
      ...navItems,
      { id: 'verification_requests', label: 'QA and Agent Info', icon: ShieldCheck },
    ];
  }

  return (
    <aside className={cn(
      "hidden md:flex w-64 border-r flex-col h-full z-20 transition-all duration-500",
      isAdminMode 
        ? "bg-black border-stone-800" 
        : "bg-dark-bg border-border-dark"
    )}>
      {isAdminMode && <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />}
      
      <div className="p-8 pb-12 relative z-10">
        <h2 className={cn(
          "text-2xl font-bold tracking-tight transition-all",
          isAdminMode ? "mono italic text-white" : "serif text-white"
        )}>
          {isAdminMode ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 cyber-panel flex items-center justify-center">
                <Terminal className="w-5 h-5 text-gold-accent animate-cyber-flicker" />
              </div>
              <span className="tracking-tighter">CENTRAL_<span className="text-gold-accent font-black">OS</span></span>
            </div>
          ) : (
            <>Salary<span className="gold-accent font-normal italic">Track</span></>
          )}
        </h2>
        {isAdminMode && (
          <div className="mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
            <span className="text-[8px] mono text-stone-600 uppercase tracking-widest font-black">KERNEL_v5.0_STABLE</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 text-sm font-medium relative z-10">
        {dynamicItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-300 group relative overflow-hidden",
                isAdminMode 
                  ? isActive 
                    ? "text-gold-accent mono bg-gold-accent/10 border-l-2 border-gold-accent" 
                    : "text-stone-600 mono hover:bg-stone-900/50 hover:text-stone-300 border-l-2 border-transparent"
                  : isActive
                    ? "border-l-2 border-gold-accent bg-gradient-to-r from-gold-accent/5 to-transparent text-gold-accent" 
                    : "border-l-2 border-transparent text-stone-400 opacity-50 hover:opacity-100 hover:text-white"
              )}
            >
              {isAdminMode && isActive && (
                <motion.div 
                  layoutId="sidebar-glow"
                  className="absolute inset-0 bg-gold-accent/5 pointer-events-none"
                />
              )}
              {isAdminMode && (
                <Icon className={cn(
                  "w-4 h-4 transition-transform group-hover:scale-110",
                  isActive ? "text-gold-accent" : "text-stone-800 group-hover:text-stone-500"
                )} />
              )}
              <span className={cn(
                "transition-all",
                isAdminMode ? "text-[10px] tracking-[0.2em] font-black uppercase" : "text-sm",
                isAdminMode && !isActive ? "italic" : ""
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {isAdminMode && (
        <div className="p-4 mx-4 mb-4 cyber-panel border-stone-900 bg-stone-950/40 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-3.5 h-3.5 text-gold-accent animate-pulse" />
            <span className="text-[9px] mono font-black text-stone-600 uppercase tracking-widest">Network_Load</span>
          </div>
          <div className="w-full h-1 bg-stone-900 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: "30%" }}
              animate={{ width: "65%" }}
              transition={{ repeat: Infinity, duration: 3, repeatType: "reverse" }}
              className="h-full bg-gold-accent shadow-[0_0_10px_rgba(197,160,89,0.5)]"
            />
          </div>
        </div>
      )}

      <div className={cn(
        "p-8 border-t relative z-10",
        isAdminMode ? "border-stone-900" : "border-border-dark"
      )}>
        <div className={cn(
          "text-[10px] uppercase tracking-[0.2em] opacity-40 mb-4",
          isAdminMode ? "mono text-white italic font-black" : "text-stone-400"
        )}>
          {isAdminMode ? "LOG_TIMESTAMP" : "Select Period"}
        </div>
        <div className={cn(
          "flex items-center justify-between px-3 py-2 border text-xs",
          isAdminMode 
            ? "bg-black border-stone-800 text-gold-accent mono italic font-black uppercase tracking-tighter" 
            : "bg-card-bg border-[#333] text-stone-300"
        )}>
          <span>{new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}</span>
          <div className="w-4 h-4 opacity-40">▼</div>
        </div>
      </div>
    </aside>
  );
}
