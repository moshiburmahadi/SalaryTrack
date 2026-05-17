import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { format, subDays, parseISO, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReTooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { 
  Loader2, 
  Users, 
  CircleDollarSign, 
  Percent, 
  Calendar as CalendarIcon,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { AttendanceRecord, AccuracyRecord, SalarySettings, KPIRecord } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { subMonths, addDays, setDate } from 'date-fns';

interface DashboardProps {
  userId: string;
  month: string;
}

export default function Dashboard({ userId, month }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [salarySettings, setSalarySettings] = useState<SalarySettings | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [accuracy, setAccuracy] = useState<AccuracyRecord[]>([]);
  const [kpiRecord, setKpiRecord] = useState<KPIRecord | null>(null);
  const [kpiConfig, setKpiConfig] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    
    // Non-realtime config and once-per-month data
    const fetchStaticData = async () => {
      try {
        const [salarySnap, accSnap, kpiSnap, configSnap] = await Promise.all([
          getDoc(doc(db, 'salary_settings', userId)),
          getDocs(query(collection(db, 'accuracy'), where('userId', '==', userId), where('month', '==', month))),
          getDocs(query(collection(db, 'kpi'), where('userId', '==', userId), where('month', '==', month))),
          getDoc(doc(db, 'config', 'kpi_bonuses_by_shift'))
        ]);

        if (salarySnap.exists()) setSalarySettings(salarySnap.data() as SalarySettings);
        setAccuracy(accSnap.docs.map(d => d.data() as AccuracyRecord));
        if (!kpiSnap.empty) setKpiRecord(kpiSnap.docs[0].data() as KPIRecord);
        if (configSnap.exists()) setKpiConfig(configSnap.data() as any);
      } catch (err) {
        console.error("Dashboard static data fetch error:", err);
      }
    };

    fetchStaticData();

    // Realtime attendance updates
    const q = query(
      collection(db, 'attendance'), 
      where('userId', '==', userId), 
      where('month', '==', month)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAttendance(snapshot.docs.map(d => d.data() as AttendanceRecord));
      setLoading(false);
    }, (err) => {
      console.error("Dashboard attendance realtime error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, month]);

  // Billing Cycle Logic: 16th of previous month to 15th of current month
  const targetMonthDate = parseISO(month + '-01');
  const cycleStart = setDate(subMonths(targetMonthDate, 1), 16);
  const cycleEnd = setDate(targetMonthDate, 15);
  const cycleDays = eachDayOfInterval({ start: cycleStart, end: cycleEnd }).length;

  const getStatsRange = (startDay: number, endDay: number) => {
    // Range-specific data: we just find the latest record in the range 
    // to reflect the status at the end of that period.
    const sortedInRange = accuracy
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
      
    return { cases: periodCases, errors: periodErrors, accuracy: acc };
  };

  const period_01_15 = getStatsRange(1, 15);
  // Cumulative including 01-15 stats
  const period_cumulative = getStatsRange(1, 31);

  // Filter attendance to ONLY show records within this cycle's date range
  const recordsInCycle = attendance.filter(a => {
    const d = parseISO(a.date);
    return isWithinInterval(d, { start: cycleStart, end: cycleEnd });
  });

  const presentDays = recordsInCycle.filter(a => a.status === 'present' || a.status === 'ot').length;
  const otDays = recordsInCycle.filter(a => a.status === 'ot').length;
  
  // Salary Calculation
  const dailyRate = salarySettings?.amount || 0;
  const normalSalary = presentDays * dailyRate;
  const otSalary = otDays * dailyRate;
  
  // KPI Bonus Logic
  let kpiBonus = 0;
  if (kpiRecord && kpiConfig && kpiConfig[kpiRecord.shift]) {
    const shiftConfig = kpiConfig[kpiRecord.shift];
    if (kpiRecord.grade === 'A') kpiBonus = shiftConfig.A;
    else if (kpiRecord.grade === 'B') kpiBonus = shiftConfig.B;
    else if (kpiRecord.grade === 'C') kpiBonus = shiftConfig.C;
  }

  const estimatedTotal = normalSalary + otSalary + kpiBonus;

  // Month Accuracy Percentage (Latest record vs sum?)
  // User says the latest update for the date should be used.
  // And the metrics should reflect the accuracy based on that latest data.
  // We sort historical data by date to find totals and deltas.
  const sortedAccuracy = [...accuracy].sort((a, b) => a.date.localeCompare(b.date));
  const latestRecord = sortedAccuracy[sortedAccuracy.length - 1];
  
  const totalCases = latestRecord?.cases || 0;
  const totalErrors = latestRecord?.errors || 0;
  
  const accuracyPercent = totalCases > 0 
    ? ((totalCases - totalErrors) / totalCases * 100).toFixed(2)
    : '0.00';

  // Last 5 days graph data: Show Delta (Today - Yesterday)
  const chartData = Array.from({ length: 5 }, (_, i) => {
    const date = subDays(new Date(), 4 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const yesterday = subDays(date, 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    
    const todayRecord = accuracy.find(a => a.date === dateStr);
    
    // Find the closest previous record (not necessarily yesterday if they skip days)
    const previousRecords = accuracy.filter(a => a.date < dateStr);
    const lastPreviousRecord = [...previousRecords].sort((a, b) => b.date.localeCompare(a.date))[0];
    
    const deltaCases = Math.max(0, (todayRecord?.cases || (lastPreviousRecord?.cases || 0)) - (lastPreviousRecord?.cases || 0));
    const deltaErrors = Math.max(0, (todayRecord?.errors || (lastPreviousRecord?.errors || 0)) - (lastPreviousRecord?.errors || 0));

    return {
      name: format(date, 'MMM dd'),
      cases: deltaCases,
      errors: deltaErrors
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 px-2 md:px-0">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 md:p-8 flex flex-col justify-between tracker-card group relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 mb-6">Total Attendance [Active Days]</div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl md:text-6xl serif gold-accent transition-transform group-hover:scale-105 duration-500 origin-left">{presentDays}</h2>
              <span className="text-stone-400 text-xs italic serif tracking-wide">working days</span>
            </div>
            <div className="mt-6 h-1 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gold-accent transition-all duration-1000 ease-out" 
                style={{ width: `${Math.min(100, (presentDays / cycleDays) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-gold-accent/5 rounded-full blur-3xl group-hover:bg-gold-accent/10 transition-colors" />
        </div>

        <div className="card p-6 md:p-8 flex flex-col justify-between tracker-card group relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 mb-8">Earning Breakdown [Calculated]</div>
            <div className="flex flex-col gap-6">
              <div className="flex items-baseline justify-between border-b border-border-dark pb-4">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest text-stone-500 mb-1">Regular Salary [Regular]</span>
                  <span className="text-2xl md:text-3xl serif text-white font-bold">{formatCurrency(normalSalary)}</span>
                </div>
              </div>
              <div className="flex items-baseline justify-between border-b border-border-dark pb-4">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest text-gold-accent mb-1">+ Overtime [Single OT]</span>
                  <span className="text-2xl md:text-3xl serif text-gold-accent font-bold">{formatCurrency(otSalary)}</span>
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest text-blue-500 mb-1">+ KPI Bonus [Performance]</span>
                  <span className="text-2xl md:text-3xl serif text-blue-500 font-bold">{formatCurrency(kpiBonus)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-20" />
        </div>
      </div>

      {/* Net Salary Summary Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-6 md:p-10 tracker-card border-gold-accent bg-gradient-to-br from-gold-accent/[0.05] to-transparent relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] gold-accent mb-4 font-black">Net Salary Summary [Cycle Total]</div>
            {!salarySettings?.amount && (
              <p className="text-red-500 text-[10px] uppercase tracking-widest mb-4 font-bold border border-red-900/30 bg-red-900/10 p-2 rounded">
                Salary rate not configured. Please set your per-day rate in Salary tab.
              </p>
            )}
            <div className="flex items-baseline gap-1 flex-wrap">
              <h1 className="text-5xl md:text-7xl serif text-white font-black tracking-tighter">
                ৳{Math.floor(estimatedTotal).toLocaleString()}
              </h1>
              <span className="text-gold-accent text-lg md:text-xl serif italic">
                .{(estimatedTotal % 1).toFixed(2).split('.')[1]}
              </span>
            </div>
            <p className="text-stone-500 text-[10px] uppercase tracking-widest mt-4 font-bold italic max-w-sm">
              Estimated total based on attendance, overtime and KPI performance
            </p>
          </div>
          <div className="flex flex-col gap-2 bg-black/40 p-5 border border-border-dark min-w-full md:min-w-[300px]">
             <div className="flex justify-between text-[10px] uppercase tracking-widest text-stone-400">
               <span>Regular</span>
               <span className="text-white">৳{normalSalary.toLocaleString()}</span>
             </div>
             <div className="flex justify-between text-[10px] uppercase tracking-widest text-gold-accent font-bold">
               <span>+ Overtime</span>
               <span>৳{otSalary.toLocaleString()}</span>
             </div>
             <div className="flex justify-between text-[10px] uppercase tracking-widest text-blue-500 font-bold border-t border-border-dark pt-2">
               <span>+ KPI Bonus</span>
               <span>৳{kpiBonus.toLocaleString()}</span>
             </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-accent/5 rounded-full blur-[100px] pointer-events-none" />
      </motion.div>

      {/* Accuracy Section */}
      <div className="card p-6 md:p-10 flex flex-col md:flex-row items-center justify-between relative overflow-hidden tracker-card group gap-8">
        <div className="relative z-10 flex-1 text-center md:text-left">
          <div className="text-[11px] uppercase tracking-[0.3em] text-stone-500 mb-6">Quality Control [Efficiency]</div>
          <h2 className={cn(
            "text-6xl md:text-8xl serif font-bold tracking-tight",
            parseFloat(accuracyPercent) >= 99.20 ? "text-green-500" :
            parseFloat(accuracyPercent) >= 99.00 ? "text-yellow-500" : "text-red-600"
          )}>
            {accuracyPercent.split('.')[0]}<span className="text-3xl md:text-4xl">.{accuracyPercent.split('.')[1]}</span><span className="gold-accent">%</span>
          </h2>
          <p className="text-stone-400 text-xs mt-6 max-w-xs mx-auto md:mx-0 leading-relaxed italic">
            Calendar Month: {format(startOfMonth(targetMonthDate), 'dd MMM')} - {format(endOfMonth(targetMonthDate), 'dd MMM, yyyy')}
          </p>
        </div>

        {/* Breakdown for Accuracy */}
        <div className="flex flex-col gap-4 w-full md:w-auto md:min-w-[200px] z-10">
          <div className="bg-gold-accent/5 p-4 border border-gold-accent/20 flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-[0.2em] text-gold-accent font-bold">16-31 (Current Period)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white italic serif">{getStatsRange(16, 31).accuracy}</span>
              <span className="text-[8px] gold-accent font-bold">%</span>
            </div>
            <div className="flex flex-col text-[8px] uppercase tracking-widest text-stone-600 font-bold">
              <span>Cases: {getStatsRange(16, 31).cases}</span>
              <span>Errors: {getStatsRange(16, 31).errors}</span>
            </div>
          </div>
          <div className="bg-black/30 p-4 border border-border-dark flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-[0.2em] text-stone-500 font-bold">Period 01-15</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-stone-300 italic serif">{period_01_15.accuracy}</span>
              <span className="text-[8px] text-stone-500 font-bold">%</span>
            </div>
            <div className="flex flex-col text-[8px] uppercase tracking-widest text-stone-600 font-bold">
              <span>Cases: {period_01_15.cases}</span>
              <span>Errors: {period_01_15.errors}</span>
            </div>
          </div>
        </div>

        <div className="w-40 h-40 rounded-full border border-border-dark flex items-center justify-center relative shadow-2xl shadow-gold-accent/5 shrink-0 hidden md:flex">
          <svg className="w-full h-full -rotate-90">
            <circle 
              cx="80" cy="80" r="74" 
              fill="none" stroke="#1A1A1A" strokeWidth="4" 
            />
            <circle 
              cx="80" cy="80" r="74" 
              fill="none" stroke="#C5A059" strokeWidth="4" 
              className="transition-all duration-1000 ease-out animate-pulse"
              strokeDasharray={464.96}
              strokeDashoffset={464.96 - (464.96 * parseFloat(accuracyPercent) / 100)}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-[10px] uppercase tracking-[0.2em] font-bold gold-accent">Peak</div>
        </div>
        
        <div className="absolute -right-20 -bottom-20 w-64 h-64 border border-[#1A1A1A] rounded-full opacity-50 transition-transform group-hover:scale-110 duration-700 hidden md:block" />
      </div>

      {/* Chart Section */}
      <div className="card p-6 md:p-8 flex flex-col tracker-card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Daily Production [Delta Trends]</div>
          <div className="flex gap-6 text-[10px] uppercase tracking-[0.15em] font-bold">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold-accent shadow-sm shadow-gold-accent/50 animate-pulse"></span>
              <span className="text-stone-300">New Cases</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-900 shadow-sm shadow-red-900/50 text-red-900"></span>
              <span className="text-stone-300">New Errors</span>
            </div>
          </div>
        </div>

        <div className="h-[250px] md:h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1A" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#57534e', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em' }} 
                dy={15} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#57534e', fontSize: 10, fontWeight: 500 }} 
              />
              <ReTooltip 
                cursor={{ fill: 'rgba(197, 160, 89, 0.03)' }}
                contentStyle={{ 
                  backgroundColor: '#141414',
                  borderRadius: '0px', 
                  border: '1px solid #262626', 
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                  padding: '12px'
                }}
                itemStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              />
              <Bar 
                dataKey="cases" 
                fill="#C5A059" 
                radius={[2, 2, 0, 0]} 
                barSize={12} 
              />
              <Bar 
                dataKey="errors" 
                fill="#7f1d1d" 
                radius={[2, 2, 0, 0]} 
                barSize={12} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
