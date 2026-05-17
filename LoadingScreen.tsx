import React, { useState, useEffect, useRef } from 'react';
import { LogOut, User as UserIcon, ShieldCheck, Key, ChevronDown, Sparkles, Terminal, Activity, Zap, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ChangePasswordModal from './ChangePasswordModal';
import ProfileVerificationModal from './ProfileVerificationModal';
import PremiumApplicationModal from './PremiumApplicationModal';
import { cn } from '../lib/utils';

interface HeaderProps {
  username: string;
  name?: string;
  rank?: string;
  isAdmin?: boolean;
  photoURL?: string;
  verified?: boolean;
  onLogout: () => void;
}

export default function Header({ username, name, rank, isAdmin, photoURL, verified, onLogout }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={cn(
      "h-20 border-b flex items-center justify-between px-4 md:px-10 shrink-0 relative transition-all duration-500",
      isAdmin ? "bg-black border-stone-800 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" : "bg-dark-bg border-border-dark"
    )}>
      {isAdmin && <div className="absolute inset-0 cyber-grid opacity-5 pointer-events-none" />}
      
      <div className="flex items-center gap-6 relative z-10">
        <div className="relative" ref={dropdownRef}>
          {/* Avatar Trigger with Cyber HUD flair */}
          <div 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 group outline-none cursor-pointer"
          >
            <div className="relative">
              <div className={cn(
                "w-12 h-12 flex items-center justify-center transition-all overflow-hidden bg-black border-2 relative",
                isAdmin 
                  ? "border-green-600 hud-corner shadow-[0_0_15px_rgba(34,197,94,0.3)]" 
                  : "rounded-full border-border-dark group-hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all"
              )}>
                 {isAdmin && (
                   <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,#22c55e_1px,#22c55e_2px)] bg-[length:100%_4px]" />
                 )}
                 {photoURL ? (
                   <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 ) : (
                   <span className={cn("text-xs font-black", isAdmin ? "mono text-gold-accent" : "text-stone-300 uppercase")}>
                     {username.slice(0, 2).toUpperCase()}
                   </span>
                 )}
              </div>
              <div className={cn(
                "absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center border transition-all",
                isAdmin 
                  ? "bg-black border-red-500 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" 
                  : "bg-dark-bg border-border-dark rounded-full text-stone-500"
              )}>
                <ChevronDown className={cn("w-3 h-3 transition-transform", showDropdown ? 'rotate-180' : '')} />
              </div>
            </div>
            
            <div className="flex flex-col items-start min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-black tracking-widest truncate max-w-[120px] md:max-w-none transition-colors",
                  isAdmin ? "mono italic text-white text-sm" : "text-xs md:text-sm text-white group-hover:text-gold-accent"
                )}>
                  {isAdmin ? `ID::${username.toUpperCase()}` : username}
                </span>
                {verified ? (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-sm transition-all shadow-lg",
                    isAdmin ? "bg-green-500/10 border border-green-500/40 text-green-500 animate-pulse" : "bg-gradient-to-r from-purple-premium to-violet-600 text-white animate-premium-glow"
                  )}>
                    <ShieldCheck className={cn("w-2.5 h-2.5", isAdmin ? "" : "fill-white")} />
                    <span className="text-[7px] font-black uppercase tracking-tighter">Verified_Node</span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPremiumModal(true);
                    }}
                    className="flex items-center gap-1 bg-purple-premium/20 border border-purple-premium/40 hover:bg-purple-premium hover:text-white transition-all px-2 py-0.5 rounded-sm group/up"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-purple-premium group-hover/up:text-white transition-colors" />
                    <span className="text-[7px] font-black text-purple-premium group-hover/up:text-white uppercase tracking-tighter transition-colors">Escalation_Req</span>
                  </button>
                )}
              </div>
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <Activity className="w-2.5 h-2.5 text-red-500 animate-pulse" />
                  <span className="text-[9px] mono font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-1 italic">Level_Zero_Admin</span>
                </div>
              ) : (rank || name) && (
                <span className="text-[9px] font-bold text-cyber-green uppercase tracking-wider mono italic">
                  {rank ? `${rank}_MOD` : ''}{name?.split(' ')[0]}
                </span>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className={cn(
                  "absolute top-full left-0 mt-4 w-72 shadow-2xl z-[150] overflow-hidden",
                  isAdmin ? "cyber-panel hud-corner border-red-500/30 p-1 bg-black" : "bg-card-bg border border-border-dark rounded-xl"
                )}
              >
                <div className={cn(
                  "p-5 border-b",
                  isAdmin ? "border-green-500/20 bg-green-500/[0.03]" : "border-border-dark bg-stone-900/50"
                )}>
                  <div className="flex items-center gap-2 mb-1.5 min-w-0">
                    <Terminal className={cn("w-3 h-3", isAdmin ? "text-green-500" : "text-gold-accent")} />
                    <p className={cn(
                      "uppercase tracking-[0.2em] font-black",
                      isAdmin ? "mono text-[9px] text-green-500/60 italic" : "text-[9px] text-stone-500"
                    )}>Auth_Terminal_Link</p>
                  </div>
                  <p className={cn(
                    "font-black truncate",
                    isAdmin ? "mono text-white text-xs tracking-widest italic" : "text-xs text-white"
                  )}>{username}</p>
                </div>

                <div className="p-2 space-y-1">
                  <button
                    onClick={() => { setShowPasswordModal(true); setShowDropdown(false); }}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all group",
                      isAdmin 
                        ? "mono text-[10px] text-stone-400 font-black uppercase tracking-[0.2em] hover:bg-green-500/10 hover:text-green-500 italic" 
                        : "text-[11px] uppercase tracking-widest text-stone-300 hover:bg-white/5 hover:text-gold-accent rounded-lg"
                    )}
                  >
                    <Key className={cn("w-4 h-4 transition-transform group-hover:scale-110", isAdmin ? "text-stone-700" : "text-stone-500")} />
                    Update_Credentials
                  </button>
                  {!isAdmin && (
                    <button
                      onClick={() => { setShowVerificationModal(true); setShowDropdown(false); }}
                      className="w-full flex items-center gap-4 px-5 py-3.5 text-left text-[11px] uppercase tracking-widest text-stone-300 hover:bg-white/5 hover:text-purple-premium transition-all rounded-lg"
                    >
                      <ShieldCheck className="w-4 h-4 text-stone-500" />
                      Verify Profile
                    </button>
                  )}
                </div>
                
                <div className={cn(
                  "p-2",
                  isAdmin ? "border-t border-red-500/20 bg-red-500/[0.05]" : "border-t border-border-dark bg-black/20"
                )}>
                  <button
                    onClick={onLogout}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all",
                      isAdmin 
                        ? "mono text-[10px] text-red-500 font-black uppercase tracking-[0.3em] hover:bg-red-500/10 italic" 
                        : "text-[11px] uppercase tracking-widest text-red-500 hover:bg-red-500/5 rounded-lg"
                    )}
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect_Node
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-black/40 border border-stone-800 rounded-sm">
          <Activity className="w-3 h-3 text-gold-accent animate-pulse" />
          <span className="mono text-[8px] font-black text-stone-600 uppercase tracking-widest italic">Uplink_Active</span>
        </div>
        
        <button 
          onClick={onLogout}
          className={cn(
            "hidden md:block transition-all px-6 py-2 border uppercase",
            isAdmin 
              ? "mono text-[10px] font-black tracking-[0.3em] text-stone-500 border-stone-800 hover:border-red-500/50 hover:text-red-500 italic bg-black" 
              : "text-[11px] tracking-widest text-stone-500 hover:text-white border-border-dark rounded hover:bg-white/5"
          )}
        >
          {isAdmin ? "HARD_EXIT" : "Quick Exit"}
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showPasswordModal && (
          <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
        )}
        {showVerificationModal && (
          <ProfileVerificationModal 
            username={username}
            onClose={() => setShowVerificationModal(false)} 
          />
        )}
        {showPremiumModal && (
          <PremiumApplicationModal 
            username={username}
            onClose={() => setShowPremiumModal(false)} 
          />
        )}
      </AnimatePresence>
    </header>
  );
}
