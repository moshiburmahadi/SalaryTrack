import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { Loader2, Award, Info, Lock } from 'lucide-react';
import { KPIRecord, AttendanceRecord } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface KPIProps {
  userId: string;
  month: string;
}

const SHIFT_GRADES = {
  morning: { A: 'Morning Elite (A)', B: 'Morning Expert (B)', C: 'Morning Associate (C)' },
  evening: { A: 'Evening Elite (A)', B: 'Evening Expert (B)', C: 'Evening Associate (C)' },
  night: { A: 'Night Elite (A)', B: 'Night Expert (B)', C: 'Night Associate (C)' }
};

export default function KPI({ userId, month }: KPIProps) {
  const [shift, setShift] = useState<'morning' | 'evening' | 'night' | ''>('');
  const [grade, setGrade] = useState<'A' | 'B' | 'C'>('A');
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Attendance for logic check-in
        const attQ = query(
          collection(db, 'attendance'),
          where('userId', '==', userId),
          where('month', '==', month)
        );
        const attSnap = await getDocs(attQ);
        const attRecords = attSnap.docs.map(d => d.data() as AttendanceRecord);
        const presentDays = attRecords.filter(r => r.status === 'present' || r.status === 'ot').length;
        setAttendanceCount(presentDays);

        // Fetch existing KPI for this month
        const kpiQ = query(
          collection(db, 'kpi'),
          where('userId', '==', userId),
          where('month', '==', month)
        );
        const kpiSnap = await getDocs(kpiQ);
        if (!kpiSnap.empty) {
          const data = kpiSnap.docs[0].data() as KPIRecord;
          setShift(data.shift as any);
          setGrade(data.grade as any);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, month]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attendanceCount < 17 || !shift) return;

    setSaving(true);
    setMessage(null);

    const recordId = `${userId}_${month}`;
    try {
      await setDoc(doc(db, 'kpi', recordId), {
        userId,
        month,
        shift,
        grade
      });
      setMessage({ type: 'success', text: 'KPI settings updated successfully' });
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
        <Loader2 className="w-8 h-8 animate-spin text-gold-accent" />
      </div>
    );
  }

  const isLocked = attendanceCount < 17;

  return (
    <div className="max-w-3xl mx-auto py-4 px-2 md:px-0">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-card-bg border border-border-dark flex items-center justify-center text-gold-accent">
          <Award className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl serif font-bold text-white tracking-tight">KPI Performance</h1>
          <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mt-1">
            Setting standards for excellence [Performance based]
          </p>
        </div>
      </div>

      {isLocked ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-8 md:p-12 tracker-card border-red-900/30 bg-red-900/[0.02] text-center"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 bg-red-950/20 border border-red-900/40 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <Lock className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <h2 className="text-lg md:text-xl serif font-bold text-red-500 mb-2">KPI Registration Locked</h2>
          <p className="text-stone-400 text-xs md:text-sm max-w-sm mx-auto mb-8 leading-relaxed">
            Minimum <span className="text-red-500 font-bold">17 days</span> of attendance is required to unlock KPI settings. 
            Current: <span className="gold-accent font-bold">{attendanceCount} days</span>.
          </p>
          <div className="w-full bg-border-dark h-[1px] mb-8" />
          <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-stone-600 font-bold italic">
            "Consistency is the key to performance"
          </p>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 md:p-10 tracker-card"
        >
          <form onSubmit={handleSave} className="space-y-8 md:space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
              <div>
                <label className="block text-[9px] md:text-[10px] uppercase tracking-[0.22em] font-black text-stone-500 mb-4">Select Shift</label>
                <div className="relative group">
                  <select 
                    value={shift}
                    onChange={(e) => {
                      setShift(e.target.value as any);
                      if (!e.target.value) setGrade('A');
                    }}
                    className="w-full px-5 py-4 md:px-6 md:py-4 bg-[#0F0F0F] border border-border-dark rounded focus:border-gold-accent outline-none transition-all text-[11px] font-bold uppercase tracking-widest text-white appearance-none cursor-pointer"
                  >
                    <option value="">Select Shift</option>
                    <option value="morning">Morning Shift</option>
                    <option value="evening">Evening Shift</option>
                    <option value="night">Night Shift</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-xs">▼</div>
                </div>
              </div>

              {shift && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <label className="block text-[9px] md:text-[10px] uppercase tracking-[0.22em] font-black text-stone-500 mb-4">Select Grade</label>
                  <div className="relative group">
                    <select 
                      value={grade}
                      onChange={(e) => setGrade(e.target.value as any)}
                      className="w-full px-5 py-4 md:px-6 md:py-4 bg-[#0F0F0F] border border-border-dark rounded focus:border-gold-accent outline-none transition-all text-[11px] font-bold uppercase tracking-widest gold-accent appearance-none cursor-pointer"
                    >
                      <option value="A">{(SHIFT_GRADES as any)[shift].A}</option>
                      <option value="B">{(SHIFT_GRADES as any)[shift].B}</option>
                      <option value="C">{(SHIFT_GRADES as any)[shift].C}</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-xs text-gold-accent">▼</div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="bg-gold-accent/[0.03] border border-gold-accent/10 p-5 md:p-6 flex gap-4">
              <Info className="w-5 h-5 text-gold-accent shrink-0" />
              <p className="text-[10px] md:text-[11px] text-stone-400 leading-relaxed tracking-wide">
                KPI Performance is calculated based on monthly attendance and quality standards. 
                Grades associate fixed bonuses: <span className="gold-accent">A (৳3000)</span>, 
                <span className="gold-accent">B (৳2000)</span>, <span className="gold-accent">C (৳1000)</span>.
              </p>
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
              Set Shift Performance
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
