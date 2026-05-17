import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Check, X, Eye, Loader2, ShieldCheck, MapPin, Phone, User as UserIcon, Award, Sparkles, CreditCard, Terminal, Database, Activity, ShieldAlert, Zap, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VerificationRequestsProps {
  isAdmin: boolean;
  viewerRank?: string;
}

export default function VerificationRequests({ isAdmin, viewerRank }: VerificationRequestsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'premium'>('profile');
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [premiumRequests, setPremiumRequests] = useState<PremiumRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    // Listen to Verification Requests
    const vq = query(collection(db, 'verification_requests'), orderBy('createdAt', 'desc'));
    const unsubscribeV = onSnapshot(vq, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VerificationRequest));
      if (!isAdmin && viewerRank === 'TL') {
        const filtered = docs.filter(r => r.rank === 'Agent' || r.rank === 'QA');
        setVerificationRequests(filtered);
      } else {
        setVerificationRequests(docs);
      }
    });

    // Listen to Premium Requests - Only for Admins
    let unsubscribeP = () => {};
    if (isAdmin) {
      const pq = query(collection(db, 'premium_requests'), orderBy('createdAt', 'desc'));
      unsubscribeP = onSnapshot(pq, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PremiumRequest));
        setPremiumRequests(docs);
      });
    }

    setLoading(false);

    return () => {
      unsubscribeV();
      unsubscribeP();
    };
  }, [isAdmin, viewerRank]);

  const handleAction = async (requestId: string, status: 'approved' | 'rejected', type: 'profile' | 'premium') => {
    // Cyber Confirmation
    const confirmed = window.confirm(`CONFIRM_ACTION: Initializing status ${status.toUpperCase()} for request [${requestId.slice(0,8)}]. PROCEED?`);
    if (!confirmed) return;
    
    setProcessingId(requestId);
    try {
      const collectionName = type === 'profile' ? 'verification_requests' : 'premium_requests';
      const requestRef = doc(db, collectionName, requestId);
      await updateDoc(requestRef, { status });
      
      if (status === 'approved' && selectedRequest) {
        const userRef = doc(db, 'users', selectedRequest.userId);
        if (type === 'profile') {
          await updateDoc(userRef, {
            name: selectedRequest.name,
            rank: selectedRequest.rank,
            verified: true
          });
        } else {
          await updateDoc(userRef, {
            verified: true
          });
        }
      }
      setSelectedRequest(null);
    } catch (err) {
      console.error(err);
      // Cyber Error
    } finally {
      setProcessingId(null);
    }
  };

  const currentRequests = activeTab === 'profile' ? verificationRequests : premiumRequests;
  const title = activeTab === 'profile' ? "IDENTITY_VALIDATION" : "PRIVILEGE_ESCALATION";
  const subtitle = activeTab === 'profile' ? "Registry Oversight :: Node Verification" : "Deep-Core Transactional Authorization";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 relative">
        <div className="fixed inset-0 cyber-grid opacity-5 pointer-events-none" />
        <Loader2 className="w-8 h-8 text-gold-accent animate-spin" />
        <p className="text-stone-500 text-[10px] mono uppercase tracking-[0.3em] font-black animate-cyber-flicker italic">
          Fetching Peripheral Sync Buffers...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 relative">
      <div className="fixed inset-0 cyber-grid pointer-events-none opacity-10 z-0" />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 relative z-10 p-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-6 bg-gold-accent shadow-[0_0_10px_rgba(197,160,89,0.5)]" />
             <h1 className="text-3xl mono font-black text-white tracking-widest uppercase italic">
              {title} <span className={cn("text-gold-accent opacity-60")}>_LOG</span>
             </h1>
          </div>
          <p className="text-[10px] mono uppercase tracking-[0.4em] text-stone-500 font-black ml-4">{subtitle}</p>
        </div>
        
        <div className="flex cyber-panel p-1 border-stone-800 self-start group">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "px-8 py-3 rounded-sm text-[10px] mono font-black tracking-[0.2em] transition-all flex items-center gap-3 uppercase",
              activeTab === 'profile' ? "bg-gold-accent text-black" : "text-stone-600 hover:text-stone-400"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Registry
          </button>
          <button
            onClick={() => setActiveTab('premium')}
            className={cn(
              "px-8 py-3 rounded-sm text-[10px] mono font-black tracking-[0.2em] transition-all flex items-center gap-3 uppercase",
              activeTab === 'premium' ? "bg-purple-premium text-white" : "text-stone-600 hover:text-stone-400"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            Escalation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 relative z-10">
        {currentRequests.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="cyber-panel p-20 text-center flex flex-col items-center justify-center border-dashed border-stone-900 bg-stone-950/20"
          >
            <Database className="w-16 h-16 text-stone-900 mb-6 animate-pulse" />
            <p className="text-stone-600 mono uppercase tracking-[0.3em] text-[10px] font-black italic underline underline-offset-8 decoration-stone-800">
              STATION_STATUS::NO_PENDING_TRAFFIC
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {currentRequests.map((request, idx) => (
              <motion.div
                layout
                key={request.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "cyber-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all group relative overflow-hidden",
                  activeTab === 'profile' ? "hover:border-gold-accent/40" : "hover:border-purple-premium/40"
                )}
              >
                <div className="absolute top-0 left-0 w-2 h-[1px] bg-white opacity-20" />
                <div className="absolute bottom-0 right-0 w-2 h-[1px] bg-white opacity-20" />
                
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-14 h-14 cyber-panel hud-corner flex items-center justify-center transition-all bg-black/40",
                    activeTab === 'profile' ? "group-hover:border-gold-accent/50 group-hover:text-gold-accent" : "group-hover:border-purple-premium/50 group-hover:text-purple-premium"
                  )}>
                    {activeTab === 'profile' ? (
                      <Terminal className="w-6 h-6 text-stone-600 transition-colors group-hover:text-gold-accent" />
                    ) : (
                      <Cpu className="w-6 h-6 text-stone-600 transition-colors group-hover:text-purple-premium" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <h3 className="text-white mono font-black tracking-widest uppercase text-lg italic">{request.username}</h3>
                      <div className={cn(
                        "text-[9px] mono px-3 py-1 rounded-sm font-black uppercase tracking-widest italic border",
                        request.status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" :
                        request.status === 'approved' ? "bg-cyber-green/10 text-cyber-green border-cyber-green/30" :
                        "bg-red-500/10 text-red-500 border-red-500/30"
                      )}>
                        {request.status.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] mono text-stone-500 uppercase font-black italic tracking-tighter">
                        {activeTab === 'premium' ? `TX_BUFFER_ID: [${request.transactionId}]` : `IDENT_STR: [${request.name}]`}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-stone-800" />
                      <span className="text-[10px] mono text-stone-700 uppercase font-bold italic tracking-tighter">
                        SEQ_HASH: {request.id!.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto">
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className={cn(
                      "flex items-center gap-3 cyber-panel bg-black/40 hover:bg-black/60 px-6 py-3 text-[10px] mono font-black tracking-[0.2em] transition-all uppercase italic",
                      activeTab === 'profile' ? "text-gold-accent border-gold-accent/20 hover:border-gold-accent/60" : "text-purple-premium border-purple-premium/20 hover:border-purple-premium/60"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5 animate-cyber-flicker" />
                    EXAMINE_DATA
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="cyber-panel border-stone-800 w-full max-w-2xl hud-corner overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative bg-black"
            >
              <div className="absolute top-0 right-0 w-24 h-[1px] bg-gold-accent/30" />
              
              <div className="p-10 border-b border-border-dark space-y-10">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 animate-pulse rounded-full" />
                      <span className={cn(
                        "text-[10px] mono font-black uppercase tracking-[0.4em] italic",
                        activeTab === 'profile' ? "text-gold-accent" : "text-purple-premium"
                      )}>
                        SECURE_ACCESS_PROTOCOL :: {selectedRequest.id?.slice(0, 12).toUpperCase()}
                      </span>
                    </div>
                    <h2 className="text-3xl mono font-black text-white italic tracking-tighter">
                      REQUEST_DATA_MANIFEST
                    </h2>
                  </div>
                  <button 
                    onClick={() => setSelectedRequest(null)}
                    className="p-3 cyber-panel border-stone-800 text-stone-500 hover:text-white transition-all bg-black group"
                  >
                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-8">
                      <div className="space-y-2">
                         <p className="text-[10px] mono text-stone-600 uppercase font-black tracking-widest ml-1">// LOCAL_IDENTITY</p>
                         <div className="flex items-center gap-4 bg-stone-950/60 p-4 border border-stone-900 rounded-sm">
                            <UserIcon className={cn("w-4 h-4", activeTab === 'profile' ? "text-gold-accent" : "text-purple-premium")} />
                            <p className="text-white mono text-sm font-black tracking-widest">{selectedRequest.name}</p>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <p className="text-[10px] mono text-stone-600 uppercase font-black tracking-widest ml-1">// UPLINK_TELEMETRY</p>
                         <div className="flex items-center gap-4 bg-stone-950/60 p-4 border border-stone-900 rounded-sm">
                            <Phone className={cn("w-4 h-4", activeTab === 'profile' ? "text-gold-accent" : "text-purple-premium")} />
                            <p className="text-white mono text-sm font-black">{selectedRequest.mobile}</p>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-8">
                      {activeTab === 'profile' ? (
                        <>
                          <div className="space-y-2">
                             <p className="text-[10px] mono text-stone-600 uppercase font-black tracking-widest ml-1">// DESIGNATED_RANK</p>
                             <div className="flex items-center gap-4 bg-stone-950/60 p-4 border border-stone-900 rounded-sm">
                                <Award className="w-4 h-4 text-gold-accent animate-cyber-flicker" />
                                <p className="text-white mono text-sm font-black tracking-[0.2em] uppercase italic">{selectedRequest.rank}</p>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <p className="text-[10px] mono text-stone-600 uppercase font-black tracking-widest ml-1">// RESIDENCE_SECTOR</p>
                             <div className="flex items-center gap-4 bg-stone-950/60 p-4 border border-stone-900 rounded-sm">
                                <MapPin className="w-4 h-4 text-gold-accent" />
                                <p className="text-white mono text-[10px] font-bold uppercase italic leading-tight">{selectedRequest.address}</p>
                             </div>
                          </div>
                        </>
                      ) : (
                          <div className="space-y-2">
                             <p className="text-[10px] mono text-stone-600 uppercase font-black tracking-widest ml-1">// TRANSACTION_HASH_TX</p>
                             <div className="flex items-center gap-4 bg-stone-950/60 p-4 border border-purple-premium/30 rounded-sm">
                                <CreditCard className="w-4 h-4 text-purple-premium" />
                                <p className="text-purple-premium mono text-sm font-black tracking-widest uppercase italic">{selectedRequest.transactionId}</p>
                             </div>
                          </div>
                      )}
                   </div>
                </div>
              </div>

              <div className="p-10 flex flex-col md:flex-row items-center justify-center gap-6 bg-stone-950/40 relative">
                <div className="absolute bottom-0 left-10 right-10 h-[1px] bg-stone-900" />
                
                {selectedRequest.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleAction(selectedRequest.id!, 'rejected', activeTab)}
                      className="flex-1 w-full cyber-panel bg-red-500/5 hover:bg-red-500/10 text-red-500 border-red-500/20 px-8 py-5 mono font-black text-[11px] uppercase tracking-[0.3em] italic transition-all group"
                    >
                      <span className="group-hover:animate-cyber-flicker">ABORT_AUTHORIZATION</span>
                    </button>
                    <button
                      disabled={processingId !== null}
                      onClick={() => handleAction(selectedRequest.id!, 'approved', activeTab)}
                      className={cn(
                        "flex-[1.5] w-full cyber-panel px-8 py-5 mono font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 relative overflow-hidden italic shadow-2xl",
                        activeTab === 'profile' ? "bg-gold-accent text-black hover:bg-gold-accent/90 shadow-gold-accent/10" : "bg-purple-premium text-white hover:bg-purple-premium/90 shadow-purple-premium/10"
                      )}
                    >
                      <div className="absolute top-0 right-0 w-8 h-[1px] bg-white opacity-40" />
                      {processingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                      EXECUTE_LEVEL_UP
                    </button>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-center gap-4 py-6 border border-dashed border-stone-800 rounded-sm bg-black group overflow-hidden">
                    <ShieldAlert className="w-4 h-4 text-stone-700 group-hover:text-gold-accent transition-colors" />
                    <p className="text-stone-700 mono uppercase tracking-[0.4em] text-[11px] font-black italic group-hover:text-stone-400 transition-colors">
                      STATION_LOG_TERMINAL :: {selectedRequest.status.toUpperCase()}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-stone-950 flex items-center justify-between">
                <p className="text-[8px] mono text-stone-800 uppercase font-black">LOG_SYSTEM_v4.2.0</p>
                <div className="flex gap-2">
                  <div className="w-3 h-1 bg-stone-900" />
                  <div className="w-3 h-1 bg-gold-accent opacity-20" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
