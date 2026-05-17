import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Save, Banknote, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SalaryProps {
  userId: string;
}

export default function Salary({ userId }: SalaryProps) {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        const docRef = doc(db, 'salary_settings', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAmount(docSnap.data().amount.toString());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSalary();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid positive number' });
      setSaving(false);
      return;
    }

    try {
      await setDoc(doc(db, 'salary_settings', userId), {
        userId,
        amount: numAmount,
        updatedAt: serverTimestamp()
      });
      setMessage({ type: 'success', text: 'Salary settings updated successfully' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 md:py-12 px-2 md:px-0">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-card-bg border border-border-dark flex items-center justify-center text-gold-accent">
          <Banknote className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl serif font-bold text-white tracking-tight">Salary Configuration</h1>
          <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mt-1">Adjust your standard amount [Day Base]</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 md:p-10 tracker-card"
      >
        <form onSubmit={handleSave} className="space-y-8">
          <div>
            <label className="block text-[9px] md:text-[10px] uppercase tracking-[0.22em] font-black text-stone-500 mb-4 flex items-center gap-2">
              Salary Amount ৳ [Standard Per Day Rate]
              <HelpCircle className="w-3 h-3 opacity-40" />
            </label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gold-accent font-bold text-xl">৳</span>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                className="w-full pl-12 pr-6 py-5 md:py-6 bg-[#0F0F0F] border border-border-dark rounded focus:border-gold-accent outline-none transition-all text-3xl md:text-4xl serif gold-accent"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {message && (
            <div className={cn(
              "p-4 rounded text-[11px] font-bold uppercase tracking-widest",
              message.type === 'success' ? 'bg-gold-accent/10 text-gold-accent border border-gold-accent/20' : 'bg-red-950/30 text-red-500 border border-red-900/50'
            )}>
              {message.text}
            </div>
          )}

          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-gold-accent hover:bg-[#B38F4D] text-black font-black uppercase tracking-[0.2em] text-xs py-5 rounded transition-all flex items-center justify-center gap-2 shadow-xl shadow-gold-accent/10"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Confirm Configuration
          </button>
        </form>
      </motion.div>
    </div>
  );
}
