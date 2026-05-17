import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, ShieldCheck, Loader2, CheckCircle2, Sparkles, Send, Clock, CalendarDays, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PremiumApplicationModalProps {
  username: string;
  onClose: () => void;
}

type Package = 'trial' | 'annual';

const FEATURES = [
  "Advanced Analytics Dashboard",
  "Priority Data Processing",
  "Exclusive Performance Insights",
  "Direct Feedback Channel",
  "Premium Profile Badge"
];

export default function PremiumApplicationModal({ username, onClose }: PremiumApplicationModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    transactionId: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSelectPackage = (pkg: Package) => {
    setSelectedPackage(pkg);
    if (pkg === 'trial') {
      handleSubmitTrial();
    } else {
      setStep(2);
    }
  };

  const handleSubmitTrial = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'premium_requests'), {
        userId: auth.currentUser.uid,
        username,
        type: 'free_trial',
        duration: '24h',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnnual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'premium_requests'), {
        userId: auth.currentUser.uid,
        username,
        ...formData,
        type: 'annual_premium',
        duration: '1y',
        price: '99 BDT',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-card-bg border border-border-dark rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border-dark flex justify-between items-center bg-purple-premium/10">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-premium" />
            <h2 className="text-lg font-bold text-white uppercase tracking-widest">Upgrade</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-purple-premium mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-wide">
                {selectedPackage === 'trial' ? 'Trial Requested' : 'Application Sent'}
              </h3>
              <div className="bg-purple-premium/5 border border-purple-premium/20 p-6 rounded-lg mb-8 max-w-sm mx-auto">
                 <p className="text-purple-premium text-sm font-medium leading-relaxed italic">
                    {selectedPackage === 'trial' 
                      ? 'Your free trial activation is being processed by the command center.'
                      : 'Your bKash transaction is under review. Premium access will be granted shortly.'}
                 </p>
              </div>
              <button
                onClick={onClose}
                className="px-10 py-3 bg-stone-900 border border-purple-premium/20 text-purple-premium rounded font-black text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-all"
              >
                Return to Station
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="pricing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Free Trial Column */}
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-b from-stone-700 to-transparent rounded-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                      <div className="relative h-full bg-black/40 border border-border-dark p-6 rounded-xl flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-stone-900 border border-border-dark rounded-full flex items-center justify-center mb-4">
                          <Clock className="w-6 h-6 text-stone-400" />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1 italic">Free Trial</h3>
                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-6">24 Hours Access</p>
                        
                        <div className="space-y-3 mb-8 w-full text-left">
                          {FEATURES.slice(0, 3).map((f, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Check className="w-3 h-3 text-stone-500 mt-0.5 shrink-0" />
                              <span className="text-[10px] text-stone-400 font-medium uppercase tracking-tight">{f}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleSelectPackage('trial')}
                          disabled={loading}
                          className="mt-auto w-full py-3 bg-stone-900 border border-border-dark text-stone-400 font-black text-[9px] uppercase tracking-[0.2em] rounded-lg hover:text-white hover:border-stone-600 transition-all disabled:opacity-50"
                        >
                          {loading && selectedPackage === 'trial' ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Start Free Trial'}
                        </button>
                      </div>
                    </div>

                    {/* Annual Column */}
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-b from-purple-premium to-violet-600 rounded-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
                      <div className="relative h-full bg-purple-premium/[0.03] border border-purple-premium/30 p-6 rounded-xl flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-purple-premium/20 border border-purple-premium/40 rounded-full flex items-center justify-center mb-4">
                          <CalendarDays className="w-6 h-6 text-purple-premium" />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1 italic">Annual Alpha</h3>
                        <p className="text-[10px] text-purple-premium font-bold uppercase tracking-widest mb-6">1 Year • 99 BDT</p>
                        
                        <div className="space-y-3 mb-8 w-full text-left">
                          {FEATURES.map((f, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Check className="w-3 h-3 text-purple-premium mt-0.5 shrink-0" />
                              <span className="text-[10px] text-white/70 font-medium uppercase tracking-tight">{f}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleSelectPackage('annual')}
                          className="mt-auto w-full py-4 bg-purple-premium text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-lg hover:bg-purple-premium/90 transition-all shadow-xl shadow-purple-premium/20"
                        >
                          Upgrade Now
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSubmitAnnual}
                  className="space-y-6 max-w-md mx-auto"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-purple-premium" />
                    <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-black">Transaction Verification</p>
                  </div>

                  <div className="bg-purple-premium/5 border border-purple-premium/20 p-5 rounded-lg mb-6 text-center">
                    <p className="text-[9px] uppercase tracking-widest text-stone-400 font-black mb-2">bKash (Send Money)</p>
                    <p className="text-2xl font-black text-white tracking-widest mb-1 italic">01738-734638</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-premium rounded-full animate-pulse" />
                      <p className="text-[10px] uppercase tracking-[0.2em] text-purple-premium font-black">99 BDT • 1 Year Access</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-stone-500 font-bold mb-2 block">Your Name</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-black/40 border border-border-dark px-4 py-3 rounded text-white text-xs focus:border-purple-premium outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-stone-500 font-bold mb-2 block">bKash Number</label>
                        <input
                          type="tel"
                          required
                          value={formData.mobile}
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                          className="w-full bg-black/40 border border-border-dark px-4 py-3 rounded text-white text-xs focus:border-purple-premium outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-stone-500 font-bold mb-2 block">Transaction ID (TrxID)</label>
                      <input
                        type="text"
                        required
                        placeholder="8X9Y7Z..."
                        value={formData.transactionId}
                        onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                        className="w-full bg-black/40 border border-border-dark px-4 py-3 rounded text-white text-xs focus:border-purple-premium outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 bg-stone-900 border border-border-dark text-stone-500 font-black text-[9px] uppercase tracking-widest rounded-lg hover:text-white transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-purple-premium hover:bg-purple-premium/90 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-lg transition-all shadow-xl shadow-purple-premium/10 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <>
                          <Send className="w-3 h-3" />
                          Finalize
                        </>
                      )}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}
