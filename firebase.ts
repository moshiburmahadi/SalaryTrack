import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Calendar, Loader2, AlertCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { motion } from 'motion/react';
import Papa from 'papaparse';
import { cn } from '../lib/utils';

interface UserRosterProps {
  username: string;
  rank: 'Agent' | 'QA' | 'TL';
}

export default function UserRoster({ username, rank }: UserRosterProps) {
  const [config, setConfig] = useState<any>(null);
  const [rosterData, setRosterData] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to current month YYYY-MM
    return new Date().toISOString().slice(0, 7);
  });
  const [loadingStep, setLoadingStep] = useState('');

  const fetchRoster = async () => {
    if (!username) {
      setError('Username not found in profile. Please set your OSS ID in settings.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep('Fetching configuration...');
    
    try {
      const isQA = rank === 'QA';
      const configPath = isQA ? 'roster_qa' : 'roster_agent_tl';
      const docSnap = await getDoc(doc(db, 'configs', configPath));
      
      if (!docSnap.exists()) {
        setError(`Roster config for ${rank} not found.`);
        setLoading(false);
        return;
      }

      const rosterConfig = docSnap.data();
      setConfig(rosterConfig);

      if (!rosterConfig.sheetUrl) {
        setError(`Roster Spreadsheet URL for ${rank} is missing.`);
        setLoading(false);
        return;
      }

      setLoadingStep('Connecting to Google Sheets...');
      
      const getCsvUrl = (targetPath: string) => {
        const urlToUse = (targetPath && (targetPath.startsWith('http') || targetPath.includes('/spreadsheets/'))) 
          ? targetPath 
          : rosterConfig.sheetUrl;
          
        const sheetIdMatch = urlToUse.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const sheetId = sheetIdMatch ? sheetIdMatch[1] : '';
        
        // Extract gid if present in the URL
        const gidMatch = urlToUse.match(/gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : null;
        
        const isTabName = !(targetPath && (targetPath.startsWith('http') || targetPath.includes('/spreadsheets/')));
        
        let baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
        if (isTabName) {
          baseUrl += `&sheet=${encodeURIComponent(targetPath)}`;
        } else if (gid) {
          baseUrl += `&gid=${gid}`;
        }
        
        return baseUrl;
      };

      // Match properly based on rank
      let targetSheetNameUsed = '';
      if (isQA) {
        targetSheetNameUsed = rosterConfig.sheetName || 'QA';
      } else {
        const tlPath = rank === 'TL' ? (rosterConfig.tlRosterUrl || rosterConfig.tlSheetName) : null;
        targetSheetNameUsed = rank === 'TL' 
          ? (tlPath || 'TL') 
          : (rosterConfig.agentSheetName || 'Agent');
      }

      const isConfigMonth = selectedMonth === rosterConfig.month;
      let csvUrl = getCsvUrl(targetSheetNameUsed);

      // If viewing a month different from what admin set as default, we try to guess sheet name
      if (!isConfigMonth) {
        const date = new Date(selectedMonth + '-01');
        const guessedName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        csvUrl = getCsvUrl(guessedName);
      }

      let response = await fetch(csvUrl);
      
      // Fallback: If guessed name fails, try the admin's original selection
      if (!response.ok && !isConfigMonth) {
        csvUrl = getCsvUrl(targetSheetNameUsed);
        response = await fetch(csvUrl);
      }

      // Final attempt for TLs specifically
      if (!response.ok && rank === 'TL') {
        const fallbackName = rosterConfig.agentSheetName || 'Agent';
        if (fallbackName !== targetSheetNameUsed) {
          csvUrl = getCsvUrl(fallbackName);
          response = await fetch(csvUrl);
        }
      }

      if (!response.ok) {
        throw new Error(`Sheet not found. Please ensure the month you selected exists as a Tab in the spreadsheet.`);
      }
      
      const csvText = await response.text();
      setLoadingStep('Analysing roster structure...');
      
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as string[][];
          if (data.length < 2) {
            setError('Spreadsheet seems empty or invalid.');
            setLoading(false);
            return;
          }

          // Search criteria normalization
          const normalize = (s: any) => s ? s.toString().trim().replace(/\s+/g, '').toUpperCase() : '';
          const targetUserNormalized = normalize(username);

          // 0. Dynamic Column Discovery: Find the Header Row and OSS ID Column
          let headerRowIdx = -1;
          let ossIdColIdx = -1;
          
          // Scan top 20 rows for a header containing "OSS ID" or similar
          for (let i = 0; i < Math.min(data.length, 20); i++) {
            const row = data[i];
            const foundIdx = row.findIndex(cell => {
              const c = normalize(cell);
              return c.includes('OSSID') || c.includes('ODDID') || c === 'ID' || c.includes('USERNAME') || c.includes('USERID');
            });
            
            if (foundIdx !== -1) {
              headerRowIdx = i;
              ossIdColIdx = foundIdx;
              break;
            }
          }

          // 1. Find User Row
          let userRowIdx = -1;
          let userRow: string[] = [];
          
          // Strategy A: Search specifically in the detected OSS ID column
          if (ossIdColIdx !== -1) {
            for (let i = headerRowIdx + 1; i < data.length; i++) {
              if (normalize(data[i][ossIdColIdx]) === targetUserNormalized) {
                userRowIdx = i;
                userRow = data[i];
                break;
              }
            }
          }

          // Strategy B: Fallback - Search anywhere in the sheet
          if (userRowIdx === -1) {
            for (let i = headerRowIdx + 1; i < data.length; i++) {
              if (data[i].some(cell => normalize(cell) === targetUserNormalized)) {
                userRowIdx = i;
                userRow = data[i];
                break;
              }
            }
          }

          if (userRowIdx === -1) {
            setError(`Could not find a row for user: ${username}`);
            setLoading(false);
            return;
          }

          // 2. Find Date Header Row
          // We search for a row that has date patterns like "1-Apr", "01/05", or just "1"
          if (headerRowIdx === -1 || !data[headerRowIdx].some(cell => /^\d{1,2}/.test(cell ? cell.toString().trim() : ''))) {
            for (let i = 0; i < Math.min(data.length, 10); i++) { // Check top 10 rows
              const row = data[i];
              const dateCount = row.filter(cell => {
                const c = cell ? cell.toString().trim() : '';
                // Matches "1", "01", "1-Apr", "1/4", etc.
                return /^(\d{1,2})(\s|[-/])?/.test(c);
              }).length;
              
              if (dateCount >= 5) { 
                headerRowIdx = i;
                break;
              }
            }
          }

          if (headerRowIdx === -1) {
            setError('Could not find the date header row (Day 1-31) in the sheet.');
            setLoading(false);
            return;
          }

          const headerRow = data[headerRowIdx];
          const schedule: Record<number, string> = {};
          const selectedMonthDate = new Date(selectedMonth + '-01');
          const monthNameShort = selectedMonthDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
          const monthNameLong = selectedMonthDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
          
          headerRow.forEach((cell, colIdx) => {
            if (!cell) return;
            const cleanCell = cell.toString().trim().toUpperCase();
            
            // Extract Day Number
            const dateMatch = cleanCell.match(/^(\d{1,2})/);
            if (dateMatch) {
              const dateNum = parseInt(dateMatch[1]);
              if (dateNum >= 1 && dateNum <= 31) {
                // Determine if this column belongs to the selected month
                // Sheets often use "1-Apr" or "01-April"
                const hasMonthMatch = cleanCell.includes(monthNameShort) || cleanCell.includes(monthNameLong);
                
                // If there's no month info in this specific cell (just "1"), check if it might be an ambiguous column
                // but if there IS month info and it doesn't match, we skip it.
                const hasOtherMonth = (cleanCell.includes('-') || cleanCell.includes('/')) && 
                                      !hasMonthMatch && 
                                      /[A-Z]/.test(cleanCell); // Has letters but not our month

                if (hasOtherMonth) return;

                const shiftVal = (userRow[colIdx] || '').toString().trim();
                if (shiftVal) {
                  // Prioritize columns that explicitly name the month
                  const isCurrentMonthSpecific = hasMonthMatch;
                  const alreadyHasValue = !!schedule[dateNum];
                  
                  if (!alreadyHasValue || isCurrentMonthSpecific) {
                    schedule[dateNum] = shiftVal;
                  }
                }
              }
            }
          });

          if (Object.keys(schedule).length === 0) {
            setError(`User record found at row ${userRowIdx + 1}, but no schedule data found in columns. Check header dates.`);
            setLoading(false);
          } else {
            setRosterData(schedule);
            setLoading(false);
          }
        },
        error: (err) => {
          console.error(err);
          setError('Error parsing spreadsheet data. Please contact admin.');
          setLoading(false);
        }
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connection error. Check spreadsheet sharing settings.');
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [username, selectedMonth]);

  const getDaysInMonth = (monthStr: string) => {
    const [year, month] = (monthStr || new Date().toISOString().slice(0, 7)).split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const daysList = Array.from({ length: getDaysInMonth(selectedMonth) }, (_, i) => i + 1);

  const getShiftBadge = (val: string) => {
    const clean = val.trim().toUpperCase();
    // Morning (Yellow)
    if (['M', 'MORNING'].includes(clean)) {
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/60 text-4xl font-black shadow-[0_0_20px_rgba(234,179,8,0.2)]';
    }
    // Evening (Blue)
    if (['E', 'EVENING'].includes(clean) || clean.includes('E.')) {
      return 'bg-blue-600/20 text-blue-400 border-blue-500/60 text-4xl font-black shadow-[0_0_20px_rgba(59,130,246,0.2)]';
    }
    // Night (Purple)
    if (['N', 'NIGHT'].includes(clean)) {
      return 'bg-purple-600/20 text-purple-400 border-purple-500/60 text-4xl font-black shadow-[0_0_20px_rgba(168,85,247,0.2)]';
    }
    // Public Holiday / Sick Leave (Yellow)
    if (['PH', 'SL'].includes(clean)) {
      return 'bg-yellow-600/10 text-yellow-400 border-yellow-500/40 text-4xl font-black';
    }
    // ADO (Green)
    if (['ADO'].includes(clean)) {
      return 'bg-emerald-600/20 text-emerald-400 border-emerald-500/60 text-3xl font-black shadow-[0_0_20px_rgba(16,185,129,0.1)]';
    }
    // Off/Left (Red)
    if (['OFF', 'LEFT', 'INACTIVE'].includes(clean)) {
      return 'bg-red-600/20 text-red-500 border-red-500/60 text-4xl font-black shadow-[0_0_20px_rgba(220,38,38,0.2)]';
    }
    return 'bg-white/5 text-white/20 border-white/10 text-2xl font-bold';
  };

  const getShiftLabel = (val: string) => {
    const clean = val.trim().toUpperCase();
    const glowClass = "animate-pulse font-black text-[11px] uppercase tracking-[0.2em]";
    if (['M', 'MORNING'].includes(clean)) return { text: 'Morning', color: `text-yellow-500 ${glowClass}` };
    if (['E', 'EVENING'].includes(clean)) return { text: 'Evening', color: `text-blue-500 ${glowClass}` };
    if (clean === 'E.BACKUP') return { text: 'Evening Backup', color: `text-blue-400 ${glowClass}` };
    if (['N', 'NIGHT'].includes(clean)) return { text: 'Night', color: `text-purple-500 ${glowClass}` };
    if (clean === 'PH') return { text: 'Public Holiday', color: `text-yellow-400 ${glowClass}` };
    if (clean === 'SL') return { text: 'Sick Leave', color: `text-yellow-400 ${glowClass}` };
    if (clean === 'ADO') return { text: 'Acc. Day Off', color: `text-emerald-400 ${glowClass}` };
    if (clean === 'OFF') return { text: 'Off Day', color: `text-red-500 ${glowClass}` };
    if (clean === 'LEFT') return { text: 'Left Status', color: `text-red-600 ${glowClass}` };
    return { text: val || '-', color: 'text-stone-600 font-bold' };
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + (i - 6));
    return d.toISOString().slice(0, 7);
  });

  if (loading && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-gold-accent" />
        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-stone-300 animate-pulse">{loadingStep || 'Syncing...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-10">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-accent/10 border border-gold-accent/30 flex items-center justify-center text-gold-accent">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl serif font-bold text-white tracking-tight uppercase">Member Roster</h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-stone-500 font-bold mt-1">Live Sync Active</p>
            </div>
           </div>

          <button 
            onClick={() => { setRefreshing(true); fetchRoster(); }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-border-dark rounded text-[10px] uppercase font-black text-stone-400 hover:text-white transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
            Manual Refresh
          </button>
        </div>

        <div className="flex flex-col items-center justify-center relative py-6">
           <div className="relative group">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
              >
                {months.map(m => (
                  <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>
                ))}
              </select>
              <h2 className="text-6xl md:text-8xl serif font-black text-white tracking-tighter text-center uppercase group-hover:text-gold-accent transition-all duration-500 drop-shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long' })}
                <span className="text-gold-accent font-light italic"> {new Date(selectedMonth + '-01').getFullYear()}</span>
              </h2>
              <div className="flex justify-center mt-4">
                <div className="h-[2px] w-48 bg-gradient-to-r from-transparent via-gold-accent/50 to-transparent" />
              </div>
           </div>
        </div>
      </div>

      {error ? (
        <div className="max-w-md mx-auto p-10 card border-red-500/20 bg-red-500/[0.02] text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-white font-bold mb-2 uppercase tracking-widest text-sm">Roster Sync Failed</h3>
            <p className="text-stone-500 text-xs mb-8 leading-relaxed">{error}</p>
            <button 
              onClick={fetchRoster}
              className="px-8 py-3 bg-white/5 border border-white/10 rounded text-[10px] uppercase font-black text-white hover:bg-white/10 transition-all flex items-center gap-2 mx-auto shadow-xl"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Connection
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-6">
          {daysList.map((day) => {
            const shiftValue = rosterData[day];
            const labelInfo = getShiftLabel(shiftValue || '');
            const todayDate = new Date();
            const isToday = todayDate.getDate() === day && todayDate.toISOString().slice(0, 7) === selectedMonth;

            return (
              <motion.div 
                key={day}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (day % 14) * 0.05 }}
                className={cn(
                  "bg-card-bg border border-border-dark p-6 group hover:border-gold-accent/40 transition-all duration-500 cursor-default relative overflow-hidden",
                  isToday && "ring-2 ring-gold-accent ring-inset border-gold-accent/50 bg-gold-accent/[0.05]"
                )}
              >
                <div className="flex justify-between items-start mb-6">
                   <span className={cn(
                      "text-[11px] font-black tracking-widest transition-colors",
                      isToday ? "text-gold-accent" : "text-stone-600 group-hover:text-gold-accent"
                   )}>DAY {day < 10 ? `0${day}` : day}</span>
                   {isToday && <span className="bg-gold-accent text-black text-[8px] px-2 py-0.5 font-black uppercase rounded shadow-lg shadow-gold-accent/20">Today</span>}
                </div>

                <div className="flex flex-col items-center justify-center min-h-[120px] gap-6">
                  <div className={cn(
                    "w-24 h-24 flex items-center justify-center rounded-2xl border transition-all duration-500 group-hover:scale-110",
                    getShiftBadge(shiftValue || '')
                  )}>
                    {shiftValue || '-'}
                  </div>
                  <p className={cn(
                    "text-center drop-shadow-lg",
                    labelInfo.color
                  )} style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}>
                    {labelInfo.text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-x-12 gap-y-8 p-10 card bg-black/40 border-border-dark justify-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 group">
          <div className="w-5 h-5 rounded shadow-[0_0_15px_rgba(234,179,8,0.6)] bg-yellow-400 animate-pulse" />
          <span className="text-[11px] uppercase tracking-widest font-black text-yellow-500 group-hover:text-yellow-400 transition-colors">M = Morning</span>
        </div>
        <div className="flex items-center gap-4 group">
          <div className="w-5 h-5 rounded shadow-[0_0_15px_rgba(59,130,246,0.6)] bg-blue-500 animate-pulse" />
          <span className="text-[11px] uppercase tracking-widest font-black text-blue-500 group-hover:text-blue-400 transition-colors">E = Evening</span>
        </div>
        <div className="flex items-center gap-4 group">
          <div className="w-5 h-5 rounded shadow-[0_0_15px_rgba(168,85,247,0.6)] bg-purple-500 animate-pulse" />
          <span className="text-[11px] uppercase tracking-widest font-black text-purple-500 group-hover:text-purple-400 transition-colors">N = Night</span>
        </div>
        <div className="flex items-center gap-4 group">
          <div className="w-5 h-5 rounded shadow-[0_0_15px_rgba(220,38,38,0.6)] bg-red-600 animate-pulse" />
          <span className="text-[11px] uppercase tracking-widest font-black text-red-600 group-hover:text-red-500 transition-colors">OFF = Day Off</span>
        </div>
        <div className="flex items-center gap-4 group">
          <div className="w-5 h-5 rounded shadow-[0_0_15px_rgba(234,179,8,0.4)] bg-yellow-400/80 animate-pulse" />
          <span className="text-[11px] uppercase tracking-widest font-black text-yellow-500 group-hover:text-yellow-400 transition-colors">PH/SL = Holiday/Sick</span>
        </div>
        <div className="flex items-center gap-4 group">
          <div className="w-5 h-5 rounded shadow-[0_0_15px_rgba(16,185,129,0.4)] bg-emerald-500 animate-pulse" />
          <span className="text-[11px] uppercase tracking-widest font-black text-emerald-500 group-hover:text-emerald-400 transition-colors">ADO = Acc. Day Off</span>
        </div>
        <div className="w-full h-px bg-border-dark/50" />
        <div className="flex items-center gap-3 text-stone-500">
           <FileSpreadsheet className="w-5 h-5 text-gold-accent/50" />
           <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">Syncing with Admin Configuration</span>
        </div>
      </div>
    </div>
  );
}
