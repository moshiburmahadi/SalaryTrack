import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isWithinInterval,
  parseISO,
  subMonths,
  addDays,
  setDay,
  setDate
} from 'date-fns';
import { Loader2, Calendar, Check, Zap, X } from 'lucide-react';
import { AttendanceRecord } from '../types';
import { cn } from '../lib/utils';
import { fetchBangladeshHolidays, Holiday } from '../services/holidayService';

interface AttendanceProps {
  userId: string;
  month: string;
  onMonthChange: (month: string) => void;
}

export default function Attendance({ userId, month: selectedMonth, onMonthChange }: AttendanceProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Billing Cycle Logic: 16th of previous month to 15th of current month
  const targetMonthDate = parseISO(selectedMonth + '-01');
  const cycleStart = setDate(subMonths(targetMonthDate, 1), 16);
  const cycleEnd = setDate(targetMonthDate, 15);

  const daysInCycle = eachDayOfInterval({
    start: cycleStart,
    end: cycleEnd
  });

  useEffect(() => {
    setLoading(true);
    
    // Fetch Holidays (Static)
    fetchBangladeshHolidays(cycleStart.getFullYear()).then(prev => {
      fetchBangladeshHolidays(cycleEnd.getFullYear()).then(curr => {
        const combinedHolidays = [...prev, ...curr];
        const uniqueHolidays = Array.from(new Map(combinedHolidays.map(h => [h.date, h])).values());
        setHolidays(uniqueHolidays);
      });
    });

    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', userId),
      where('month', '==', selectedMonth)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceRecord[];
      const validRecords = data.filter(r => {
        const d = parseISO(r.date);
        return isWithinInterval(d, { start: cycleStart, end: cycleEnd });
      });
      setRecords(validRecords);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, selectedMonth]);

  const updateAttendance = async (date: Date, status: 'present' | 'ot' | 'off-day') => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const recordId = `${userId}_${dateStr}`;
    setSavingId(dateStr);

    try {
      await setDoc(doc(db, 'attendance', recordId), {
        userId,
        date: dateStr,
        month: selectedMonth,
        status: status
      });
      setRecords(prev => {
        const filtered = prev.filter(r => r.date !== dateStr);
        return [...filtered, { userId, date: dateStr, month: selectedMonth, status }];
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthChange(e.target.value);
  };

  const generateMonths = () => {
    const months = [];
    const now = new Date();
    // Add Next Month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    months.push(format(nextMonth, 'yyyy-MM'));
    // Add Current Month
    months.push(format(now, 'yyyy-MM'));
    // Add last 10 months
    for (let i = 1; i < 11; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(format(d, 'yyyy-MM'));
    }
    return months;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold-accent" />
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-card-bg border border-border-dark flex items-center justify-center text-gold-accent">
            <Calendar className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl serif font-bold text-white tracking-tight">Attendance</h1>
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mt-1">
              {format(cycleStart, '16 MMM')} to {format(cycleEnd, '15 MMM, yyyy')}
            </p>
          </div>
        </div>

        {/* Button Legend & Summary */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-card-bg/30 border border-border-dark p-3 rounded w-full lg:w-auto">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[10px] uppercase tracking-widest font-bold">
            <div className="flex items-center gap-2 text-gold-accent">
              <div className="w-6 h-6 border border-gold-accent flex items-center justify-center"><Check className="w-3 h-3" /></div>
              Present ({records.filter(r => r.status === 'present').length})
            </div>
            <div className="flex items-center gap-2 text-blue-500">
              <div className="w-6 h-6 border border-blue-500 flex items-center justify-center"><Zap className="w-3 h-3" /></div>
              OT ({records.filter(r => r.status === 'ot').length})
            </div>
            <div className="flex items-center gap-2 text-red-900 opacity-60">
              <div className="w-6 h-6 border border-red-900 flex items-center justify-center"><X className="w-3 h-3" /></div>
              Off ({records.filter(r => r.status === 'off-day').length})
            </div>
          </div>
          
          <div className="h-4 w-[1px] bg-border-dark hidden sm:block mx-2" />
          
          <div className="text-[10px] uppercase tracking-widest font-bold text-stone-300">
            Work Days: <span className="text-white">{records.filter(r => r.status === 'present' || r.status === 'ot').length}</span>
          </div>
        </div>

        <div className="flex flex-col items-stretch md:items-end gap-1 w-full md:w-auto">
           <span className="text-[9px] uppercase tracking-widest text-stone-500 font-black mb-1 hidden md:block">Running Month</span>
           <select 
            value={selectedMonth}
            onChange={handleMonthChange}
            className="bg-card-bg border border-border-dark rounded px-4 py-3 text-[11px] uppercase tracking-widest font-bold text-gold-accent outline-none focus:border-gold-accent transition-all shadow-sm cursor-pointer w-full"
           >
            {generateMonths().map(m => (
              <option key={m} value={m}>{format(parseISO(m + '-01'), 'MMMM yyyy').toUpperCase()}</option>
            ))}
           </select>
           <p className="text-[9px] text-stone-600 mt-1 uppercase tracking-tight text-center md:text-right">Cycle: 16th {format(subMonths(targetMonthDate, 1), 'MMM')} - 15th {format(targetMonthDate, 'MMM')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {daysInCycle.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const record = records.find(r => r.date === dateStr);
          const holiday = holidays.find(h => h.date === dateStr);
          const currentStatus = record?.status;
          const isSaving = savingId === dateStr;

          return (
            <div
              key={dateStr}
              className={cn(
                "p-4 border transition-all duration-300 flex flex-col justify-between h-40 group relative overflow-hidden bg-card-bg",
                holiday ? "border-green-600/40 bg-green-600/[0.03]" :
                currentStatus === 'present' ? "border-gold-accent bg-gold-accent/[0.03]" : 
                currentStatus === 'ot' ? "border-blue-500 bg-blue-500/[0.03]" :
                currentStatus === 'off-day' ? "border-red-900 bg-red-900/[0.03]" :
                "border-border-dark hover:border-stone-700"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className={cn(
                    "text-2xl serif font-bold",
                    holiday ? "text-green-500" :
                    currentStatus === 'present' ? "text-gold-accent" : 
                    currentStatus === 'ot' ? "text-blue-500" :
                    currentStatus === 'off-day' ? "text-red-900" : "text-stone-700"
                  )}>{format(day, 'dd')}</span>
                  <p className="text-[9px] uppercase font-bold tracking-widest opacity-40">{format(day, 'EEE')}</p>
                </div>
                {isSaving && <Loader2 className="w-3 h-3 animate-spin text-stone-500" />}
              </div>

              {/* Holiday Name Display */}
              {holiday && (
                <div className="mt-1 mb-2">
                  <p className="text-[8px] font-black text-green-600/60 uppercase tracking-[0.2em] mb-0.5">Public Holiday</p>
                  <p className="text-[10px] font-bold text-stone-400 leading-tight line-clamp-2 italic">
                    {holiday.localName || holiday.name}
                  </p>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-auto">
                {!holiday && (
                  <button 
                    onClick={() => updateAttendance(day, 'present')}
                    disabled={isSaving}
                    className={cn(
                      "flex-1 h-9 flex items-center justify-center border transition-all",
                      currentStatus === 'present' 
                        ? "bg-gold-accent border-gold-accent text-black" 
                        : "border-border-dark text-stone-500 hover:border-gold-accent hover:text-gold-accent"
                    )}
                    title="Present"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => updateAttendance(day, 'ot')}
                  disabled={isSaving}
                  className={cn(
                    "flex-1 h-9 flex items-center justify-center border transition-all",
                    currentStatus === 'ot' 
                      ? "bg-blue-600 border-blue-600 text-white" 
                      : "border-border-dark text-stone-500 hover:border-blue-600 hover:text-blue-500"
                  )}
                  title="Overtime"
                >
                  <Zap className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => updateAttendance(day, 'off-day')}
                  disabled={isSaving}
                  className={cn(
                    "flex-1 h-9 flex items-center justify-center border transition-all",
                    currentStatus === 'off-day' 
                      ? "bg-red-900 border-red-900 text-white" 
                      : "border-border-dark text-stone-500 hover:border-red-900 hover:text-red-800"
                  )}
                  title="Off Day"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Indicator */}
              {(currentStatus || holiday) && (
                <div className={cn(
                  "absolute top-0 left-0 w-full h-[1px]",
                  holiday ? "bg-green-600" :
                  currentStatus === 'present' ? "bg-gold-accent" : 
                  currentStatus === 'ot' ? "bg-blue-500" : "bg-red-900"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
