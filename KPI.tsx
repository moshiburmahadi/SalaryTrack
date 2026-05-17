import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Banknote, 
  CalendarCheck, 
  Target, 
  History,
  Menu,
  X,
  ChevronRight,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  Terminal,
  Activity,
  Search
} from 'lucide-react';
import { View } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface MobileNavigationProps {
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

export default function MobileNavigation({ currentView, isAdminMode, rank, setView }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleSelect = (view: View) => {
    setView(view);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Menu Button - Bottom Left */}
      <button 
        onClick={toggleMenu}
        className={cn(
          "fixed bottom-6 left-6 w-14 h-14 flex items-center justify-center z-[200] md:hidden active:scale-95 transition-all outline-none",
          isAdminMode 
            ? "cyber-panel bg-black border-gold-accent text-gold-accent shadow-[0_0_20px_rgba(197,160,89,0.3)] animate-cyber-flicker" 
            : "bg-gold-accent text-black rounded-full shadow-2xl shadow-gold-accent/20 border-4 border-dark-bg"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Terminal className="w-6 h-6 animate-pulse" />}
      </button>

      {/* Popup Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[198] md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className={cn(
                "fixed bottom-24 left-6 right-6 z-[199] md:hidden shadow-2xl transition-all duration-500",
                isAdminMode ? "cyber-panel hud-corner p-8 bg-black border-gold-accent/40" : "bg-card-bg border border-border-dark rounded-xl p-6"
              )}
            >
              {isAdminMode && <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />}
              
              <div className="mb-8 relative z-10">
                <h2 className={cn(
                  "text-xl font-black uppercase tracking-widest italic flex items-center gap-3",
                  isAdminMode ? "mono text-white" : "serif text-white"
                )}>
                  {isAdminMode && <Activity className="w-4 h-4 text-gold-accent animate-pulse" />}
                  {isAdminMode ? "SYSTEM_COMMAND" : "Navigation"}
                </h2>
                <p className={cn(
                  "text-[9px] uppercase tracking-widest font-black mt-1",
                  isAdminMode ? "mono text-gold-accent/60" : "text-stone-500"
                )}>{isAdminMode ? "Uplink_Node_Registry_v5.0" : "Navigate Command Center"}</p>
              </div>

              <div className="grid grid-cols-1 gap-2 relative z-10 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {dynamicItems.map((item) => {
                  const isActive = currentView === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 transition-all text-left group overflow-hidden relative",
                        isAdminMode 
                          ? isActive 
                            ? "bg-gold-accent/10 border-l-4 border-gold-accent text-gold-accent mono italic" 
                            : "bg-stone-900/30 text-stone-600 mono hover:text-stone-300 border-l-4 border-transparent"
                          : isActive
                            ? "bg-gold-accent/10 border-l-4 border-gold-accent text-gold-accent rounded-lg" 
                            : "bg-black/20 text-stone-400 hover:text-white rounded-lg"
                      )}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-gold-accent" : "text-stone-700")} />
                        <span className={cn(
                          "font-black uppercase tracking-[0.2em]",
                          isAdminMode ? "text-[10px]" : "text-xs"
                        )}>{item.label}</span>
                      </div>
                      <ChevronRight className={cn("w-4 h-4 opacity-40 transition-all", isActive ? "opacity-100 translate-x-1" : "group-hover:opacity-100")} />
                      
                      {isAdminMode && isActive && (
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(197,160,89,0.03)_10px,rgba(197,160,89,0.03)_20px)]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className={cn(
                "mt-8 pt-6 border-t flex items-center justify-between relative z-10",
                isAdminMode ? "border-stone-900" : "border-border-dark"
              )}>
                 <div className="flex flex-col">
                    <span className={cn(
                      "text-[8px] uppercase tracking-widest font-black",
                      isAdminMode ? "mono text-stone-700" : "text-stone-600"
                    )}>{isAdminMode ? "ACTIVE_UPLINK" : "Active Station"}</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      isAdminMode ? "mono text-gold-accent italic" : "text-white"
                    )}>{isAdminMode ? 'BD-GX_COMMAND' : 'User Terminal'}</span>
                 </div>
                 <div className={cn(
                   "w-3 h-3 rounded-full animate-pulse shadow-sm",
                   isAdminMode ? "bg-red-500 shadow-red-500" : "bg-gold-accent shadow-gold-accent"
                 )} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
