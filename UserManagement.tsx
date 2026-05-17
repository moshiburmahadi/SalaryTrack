import React, { useState, useEffect } from 'react';
import { format, subMonths, parseISO } from 'date-fns';
import { History as HistoryIcon, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AttendanceRecord } from '../types';

interface HistoryProps {
  userId: string;
  onMonthSelect: (month: string) => void;
}

export default function History({ userId, onMonthSelect }: HistoryProps) {
  const [activeMonths, setActiveMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveMonths = async () => {
      try {
        const q = query(collection(db, 'attendance'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const records = snap.docs.map(d => d.data() as AttendanceRecord);
        const months = Array.from(new Set(records.map(r => r.month))).sort().reverse();
        
        // Ensure current month is always represented even if empty
        const currentMonth = format(new Date(), 'yyyy-MM');
        if (!months.includes(currentMonth)) {
          months.unshift(currentMonth);
        }
        
        setActiveMonths(months);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveMonths();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 px-2 md:px-0">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-card-bg border border-border-dark flex items-center justify-center text-gold-accent">
          <HistoryIcon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl serif font-bold text-white tracking-tight">Earning Archives</h1>
          <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mt-1">Monthly performance and cycle logs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {activeMonths.map((month, index) => {
          const date = parseISO(month + '-01');
          return (
            <motion.button
              key={month}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onMonthSelect(month)}
              className="flex items-center justify-between p-5 md:p-8 bg-card-bg border border-border-dark shadow-sm hover:border-gold-accent/40 hover:bg-[#1A1A1A] transition-all group"
            >
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-[#0F0F0F] border border-border-dark flex items-center justify-center text-stone-600 group-hover:text-gold-accent transition-colors shrink-0">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110" />
                </div>
                <div className="text-left">
                  <p className="text-lg md:text-xl serif font-bold text-white group-hover:text-gold-accent transition-colors">
                    {format(date, 'MMMM yyyy')}
                  </p>
                  <p className="text-[9px] text-stone-500 font-bold uppercase tracking-[0.2em]">{format(date, 'MMM')} Cycle Records</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 md:gap-3 text-stone-500 group-hover:text-gold-accent font-bold transition-colors shrink-0">
                <span className="text-[9px] uppercase tracking-widest hidden sm:inline">Details</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
