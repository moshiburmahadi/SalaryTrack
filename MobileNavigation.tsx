import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, ShieldCheck, Loader2, CheckCircle2, User, Phone, MapPin, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileVerificationModalProps {
  username: string;
  onClose: () => void;
}

export default function ProfileVerificationModal({ username, onClose }: ProfileVerificationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    rank: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'verification_requests'), {
        userId: auth.currentUser.uid,
        username,
        ...formData,
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
        className="w-full max-w-lg bg-card-bg border border-border-dark rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border-dark flex justify-between items-center bg-stone-900/50">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-gold-accent" />
            <h2 className="text-lg font-bold text-white uppercase tracking-widest">Verify Profile</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-gold-accent mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-wide">Request Submitted</h3>
              <div className="bg-gold-accent/5 border border-gold-accent/20 p-6 rounded-lg mb-8">
                 <p className="text-gold-accent text-sm font-medium leading-relaxed italic">
                    Wait for authority confirmation. Your profile is currently under review by the Command Center.
                 </p>
              </div>
              <button
                onClick={onClose}
                className="px-10 py-3 bg-stone-900 hover:bg-stone-800 text-gold-accent border border-gold-accent/20 rounded font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Close Station
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-4 bg-gold-accent" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-black">Submit Credentials for Official Verification</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">
                    <User className="w-3 h-3" />
                    Official Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Legal Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black/40 border border-border-dark px-4 py-3 rounded text-white text-sm focus:outline-none focus:border-gold-accent transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">
                    <Phone className="w-3 h-3" />
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+880..."
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full bg-black/40 border border-border-dark px-4 py-3 rounded text-white text-sm focus:outline-none focus:border-gold-accent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">
                    <Award className="w-3 h-3" />
                    Rank Designation
                  </label>
                  <select
                    required
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    className="w-full bg-black/40 border border-border-dark px-4 py-3 rounded text-white text-sm focus:outline-none focus:border-gold-accent transition-all appearance-none"
                  >
                    <option value="" className="bg-card-bg">Select Rank</option>
                    <option value="Agent" className="bg-card-bg">Agent</option>
                    <option value="QA" className="bg-card-bg">QA</option>
                    <option value="TL" className="bg-card-bg">Team Leader (TL)</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">
                    <MapPin className="w-3 h-3" />
                    Station Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-black/40 border border-border-dark px-4 py-3 rounded text-white text-sm focus:outline-none focus:border-gold-accent transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-2 pt-4">
                <button
                  disabled={loading}
                  className="w-full bg-gold-accent hover:bg-gold-accent/90 text-black font-black text-xs uppercase tracking-[0.2em] py-4 rounded-lg transition-all shadow-xl shadow-gold-accent/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm for Authority Review'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
