import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { X, Key, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updatePassword(auth.currentUser, newPassword);
      // Sync with Firestore for retrieval feature
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        password: newPassword
      });
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setError('For security, please log out and log back in before changing your password.');
      } else {
        setError(err.message || 'Failed to update password');
      }
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
        className="w-full max-w-md bg-card-bg border border-border-dark rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border-dark flex justify-between items-center bg-stone-900/50">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-gold-accent" />
            <h2 className="text-lg font-bold text-white uppercase tracking-widest">Update Security</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Success</h3>
              <p className="text-stone-400 text-sm">Your security credentials have been updated.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg flex items-center gap-3 text-red-500 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">New Security Code</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/40 border border-border-dark px-4 py-3 rounded-lg text-white text-sm focus:outline-none focus:border-gold-accent transition-all"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">Verify Security Code</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/40 border border-border-dark px-4 py-3 rounded-lg text-white text-sm focus:outline-none focus:border-gold-accent transition-all"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full bg-gold-accent hover:bg-gold-accent/90 text-black font-black text-xs uppercase tracking-[0.2em] py-4 rounded-lg transition-all shadow-xl shadow-gold-accent/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Core Security'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
