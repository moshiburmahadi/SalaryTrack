import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2, Target, Plus, TrendingUp, AlertCircle, Trash2, X } from 'lucide-react';
import { AccuracyRecord } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AccuracyProps {
  userId: string;
}

export default function Accuracy({ userId }: AccuracyProps) {
  const [cases, setCases] = useState<string>('');
  const [errors, setErrors] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<AccuracyRecord[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthStr = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'accuracy'),
          where('userId', '==', userId),
          where('month', '==', monthStr)
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => doc.data() as AccuracyRecord);
        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId, monthStr]);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const q = query(
        collection(db, 'accuracy'),
        where('userId', '==', userId),
        where('month', '==', monthStr)
      );
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      setHistory([]);
      setShowDeleteModal(false);
      setMessage({ type: 'success', text: 'All accuracy records for this month have been deleted' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to delete data' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const numCases = parseInt(cases);
    const numErrors = parseInt(errors);

    if (isNaN(numCases) || isNaN(numErrors) || numCases < 0 || numErrors < 0) {
      setMessage({ type: 'error', text: 'Please enter valid positive numbers' });
      setSaving(false);
      return;
    }

    try {
      const recordId = `${userId}_${todayStr}`;
      
      // The user wants the dashboard to show the latest data as the cumulative total,
      // and the graph chart to show the difference (delta).
      // So here we store the total amount they enter.
      
      await setDoc(doc(db, 'accuracy', recordId), {
        userId,
        date: todayStr,
        month: monthStr,
        cases: numCases,
        errors: numErrors
      });

      setHistory(prev => {
        const filtered = prev.filter(p => p.date !== todayStr);
        return [...filtered, { userId, date: todayStr, month: monthStr, cases: numCases, errors: numErrors }];
      });

      setCases('');
      setErrors('');
      setMessage({ type: 'success', text: 'Data submitted successfully' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save data' });
    } finally {
      setSaving(false);
    }
  };

  const getStatsRange = (startDay: number, endDay: number) => {
    // We just find the latest record in the range to reflect the status at the end of that period.
    const sortedInRange = history
      .filter(r => {
        const day = parseInt(r.date.split('-')[2]);
        return day >= startDay && day <= endDay;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const latestInRange = sortedInRange[sortedInRange.length - 1];

    if (!latestInRange) return { cases: 0, errors: 0, accuracy: '0.00' };

    const periodCases = latestInRange.cases;
    const periodErrors = latestInRange.errors;
    
    const acc = periodCases > 0 
      ? ((periodCases - periodErrors) / periodCases * 100).toFixed(2)
      : '0.00';
      
    return { cases: periodCases, errors: periodErrors, accuracy: acc, count: sortedInRange.length };
  };

  const period_01_15 = getStatsRange(1, 15);
  // Period 16-31 now includes 01-15 (Cumulative Month Total) as per request: "1-15 adds to 16-31"
  const period_cumulative = getStatsRange(1, 31);

  const cumulativeTotal = period_cumulative;
  const accuracy = period_cumulative.accuracy;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 px-2 md:px-0 relative">
      {/* Deletion Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-card-bg border border-border-dark p-8 rounded shadow-2xl relative"
          >
            <button 
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-stone-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-red-950/20 border border-red-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl serif font-bold text-white mb-2">Delete accuracy data?</h3>
              <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-8">
                Are you sure you want to delete all accuracy records for {format(new Date(), 'MMMM yyyy')}? This action cannot be undone.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="py-4 border border-border-dark text-[10px] uppercase tracking-widest font-black text-stone-500 hover:text-white transition-all"
                >
                  No, Cancel
                </button>
                <button 
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="py-4 bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase tracking-widest font-black transition-all flex items-center justify-center"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete All'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-card-bg border border-border-dark flex items-center justify-center text-gold-accent">
            <Target className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl serif font-bold text-white tracking-tight">Accuracy Tracker</h1>
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mt-1">Precision monitoring for daily outputs</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="p-3 bg-red-950/10 border border-red-900/30 text-red-600 hover:bg-red-600 hover:text-white transition-all rounded"
          title="Delete all monthly records"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Accuracy Summary Zones - Swapped Order: 16-31 first, then 1-15 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Cumulative Month Box (Labeled 16-31) */}
        <div className="card p-6 tracker-card border-gold-accent/20 bg-gold-accent/[0.02] relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-gold-accent font-bold">Period: 16-31 (Incl. 01-15)</p>
              <span className="text-[8px] px-2 py-0.5 bg-gold-accent/10 gold-accent rounded-full font-bold uppercase tracking-widest italic shrink-0">Monthly Total</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-stone-400 font-medium mb-1">Status Summary</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white italic serif tracking-tighter">{period_cumulative.accuracy}</span>
                  <span className="text-xs gold-accent font-bold">%</span>
                </div>
              </div>
              <div className="flex flex-col items-end text-[9px] text-stone-600 font-bold uppercase tracking-widest leading-relaxed">
                 <span>Total Cases: {period_cumulative.cases}</span>
                 <span>Total Errors: {period_cumulative.errors}</span>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-accent/5 rounded-full blur-[80px] opacity-20 pointer-events-none" />
        </div>

        {/* 01-15 Box */}
        <div className="card p-6 tracker-card border-stone-800 bg-[#0A0A0A] relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-stone-500 font-bold">Period: 01-15</p>
              {period_01_15.count > 0 && <span className="text-[8px] px-2 py-0.5 bg-stone-900 text-stone-500 rounded-full font-bold uppercase tracking-widest shrink-0">{period_01_15.count} Days recorded</span>}
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-stone-400 font-medium mb-1">Status Summary</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-stone-300 italic serif">{period_01_15.accuracy}</span>
                  <span className="text-xs text-stone-500 font-bold">%</span>
                </div>
              </div>
              <div className="flex flex-col items-end text-[9px] text-stone-700 font-bold uppercase tracking-widest leading-relaxed">
                 <span>Total Cases: {period_01_15.cases}</span>
                 <span>Total Errors: {period_01_15.errors}</span>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl opacity-20 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="card p-8 tracker-card">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-4">Total Cases</p>
          <p className="text-4xl font-black text-white px-0 serif">{cumulativeTotal.cases}</p>
        </div>
        <div className="card p-8 tracker-card">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-4">Total Errors</p>
          <p className="text-4xl font-black text-red-900 serif">{cumulativeTotal.errors}</p>
        </div>
        <div className="card p-8 tracker-card border-gold-accent/20 bg-gold-accent/[0.02]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold-accent font-bold mb-4">Month Accuracy %</p>
          <div className="flex items-baseline gap-1">
            <p className="text-4xl font-black gold-accent serif">{accuracy}%</p>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-6 md:p-10 tracker-card"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            <div>
              <label className="block text-[9px] md:text-[10px] uppercase tracking-[0.22em] font-black text-stone-500 mb-4">Today's Case</label>
              <input 
                type="number" 
                placeholder="0"
                className="w-full px-5 py-5 md:px-6 md:py-6 bg-[#0F0F0F] border border-border-dark rounded focus:border-gold-accent outline-none transition-all text-2xl md:text-3xl serif gold-accent"
                value={cases}
                onChange={(e) => setCases(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[9px] md:text-[10px] uppercase tracking-[0.22em] font-black text-stone-500 mb-4">Error</label>
              <input 
                type="number" 
                placeholder="0"
                className="w-full px-5 py-5 md:px-6 md:py-6 bg-[#0F0F0F] border border-border-dark rounded focus:border-red-900 outline-none transition-all text-2xl md:text-3xl serif text-red-900"
                value={errors}
                onChange={(e) => setErrors(e.target.value)}
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
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Daily Record
          </button>
        </form>
      </motion.div>
    </div>
  );
}
