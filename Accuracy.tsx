import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User 
} from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  Timestamp, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { UserProfile, View } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Attendance from './components/Attendance';
import Accuracy from './components/Accuracy';
import KPI from './components/KPI';
import History from './components/History';
import Salary from './components/Salary';
import AdminDashboard from './components/AdminDashboard';
import AdminKPISet from './components/AdminKPISet';
import UserManagement from './components/UserManagement';
import AdminRosterConfig from './components/AdminRosterConfig';
import UserRoster from './components/UserRoster';
import VerificationRequests from './components/VerificationRequests';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import { syncTodayAttendanceWithRoster } from './services/rosterService';
import MobileNavigation from './components/MobileNavigation';
import Header from './components/Header';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertTriangle } from 'lucide-react';

import LoadingScreen from './components/LoadingScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [splashLoading, setSplashLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return localStorage.getItem('last_viewed_month') || new Date().toISOString().slice(0, 7);
  });

  useEffect(() => {
    localStorage.setItem('last_viewed_month', selectedMonth);
  }, [selectedMonth]);
  const [kpiAlert, setKpiAlert] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [dismissedWarning, setDismissedWarning] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile?.username) {
      syncTodayAttendanceWithRoster(profile.username, user.uid, profile.rank || 'Agent');
    }
  }, [profile?.username, profile?.rank, user]);

  useEffect(() => {
    // Artificial delay for splash screen branding
    const timer = setTimeout(() => {
      setSplashLoading(false);
    }, 2500);

    let profileUnsub: (() => void) | null = null;
    let heartbeatInterval: any = null;

    const SUPER_ADMINS = ['bd-gx@tracker.app', 'moshibur.mahadi@gmail.com'];

    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
      // Clean up previous listeners if user changes
      if (profileUnsub) profileUnsub();
      if (heartbeatInterval) clearInterval(heartbeatInterval);

      setUser(authenticatedUser);
      
      if (authenticatedUser) {
        const isSuperAdmin = SUPER_ADMINS.includes(authenticatedUser.email || '');

        // 1. Initial State / Fast-path
        if (isSuperAdmin) {
          setIsAdmin(true);
          setCurrentView('admin');
        }

        // 2. Real-time Profile Monitor
        profileUnsub = onSnapshot(doc(db, 'users', authenticatedUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            
            // Self-healing: If username is missing but email follows our format, recover it
            if (!data.username && authenticatedUser.email?.endsWith('@tracker.app')) {
              const recoveredUsername = authenticatedUser.email.split('@')[0].toUpperCase();
              try {
                await updateDoc(doc(db, 'users', authenticatedUser.uid), {
                  username: recoveredUsername,
                  // Use name fallback if missing too
                  ...( !data.name ? { name: recoveredUsername } : {} ),
                  createdAt: data.createdAt || serverTimestamp()
                });
              } catch (e) {}
            }

            // Auto logout if banned while logged in (Admin is exempt)
            if (data.isBanned && !SUPER_ADMINS.includes(authenticatedUser.email || '')) {
              handleLogout();
            }
          } else if (isSuperAdmin) {
            // Ensure Admin profile exists for heartbeats and display if they are a superadmin logging in for the first time
            try {
              await setDoc(doc(db, 'users', authenticatedUser.uid), {
                name: 'Administrator',
                username: 'BD-GX',
                createdAt: serverTimestamp(),
                isAdmin: true
              });
            } catch (e) {}
          }
        }, (err) => {
          console.error('Profile snapshot error:', err);
        });

        // 3. Heartbeat
        const updateHeartbeat = async () => {
          // Special one-time fix for requested user ID if admin
          if (isSuperAdmin) {
            try {
              const targetRef = doc(db, 'users', '1XnYRJ0Un5MKJzHVsRijiJyp3532');
              const targetSnap = await getDoc(targetRef);
              if (targetSnap.exists() && (!targetSnap.data().username || targetSnap.data().username !== 'BD-GX 3107')) {
                await updateDoc(targetRef, { username: 'BD-GX 3107' });
              }
            } catch (e) {}
          }

          try {
            await setDoc(doc(db, 'users', authenticatedUser.uid), { 
              lastSeen: serverTimestamp(),
              active: true 
            }, { merge: true });
          } catch (e: any) {}
        };
        updateHeartbeat();
        heartbeatInterval = setInterval(updateHeartbeat, 60000);
        
        setLoading(false);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      clearTimeout(timer);
    };
  }, []);

  const handleAdminSuccess = () => {
    setIsAdmin(true);
    setCurrentView('admin');
  };

  const handleLogout = async () => {
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { active: false }, { merge: true });
      } catch (e) {}
    }
    await signOut(auth);
    setIsAdmin(false);
    setViewingUserId(null);
    setCurrentView('dashboard');
  };

  const closeWarning = async () => {
    if (!profile?.warning) return;
    setDismissedWarning(profile.warning);
    try {
      await setDoc(doc(db, 'users', user?.uid!), { warningSeen: true }, { merge: true });
    } catch (e) {}
  };

  const checkKPIAccess = async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', user.uid),
        where('month', '==', selectedMonth)
      );
      const snap = await getDocs(q);
      const attendanceCount = snap.docs.filter(d => d.data().status === 'present' || d.data().status === 'ot').length;
      
      if (attendanceCount < 17) {
        setKpiAlert(`আগে আপনার অন্তত ১৭ দিন অ্যাটেনডেন্স দিন, তা না হলে KPI এর অ্যাক্সেস পাবেন না। (Current: ${attendanceCount} days)`);
        setTimeout(() => setKpiAlert(null), 5000);
        return false;
      }
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const navigateToKpi = async () => {
    const hasAccess = await checkKPIAccess();
    if (hasAccess) {
      setCurrentView('kpi');
    }
  };

  const effectiveUserId = viewingUserId || (user ? user.uid : null);

  return (
    <>
      <AnimatePresence mode="wait">
        {(loading || splashLoading) ? (
          <LoadingScreen key="loading" />
        ) : !user && !isAdmin ? (
          <motion.div 
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-dark-bg"
          >
            <Auth onAuthSuccess={() => setCurrentView('dashboard')} onAdminSuccess={handleAdminSuccess} />
          </motion.div>
        ) : (
          <motion.div 
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-screen bg-dark-bg font-sans selection:bg-gold-accent/30 selection:text-gold-accent relative"
          >
            {/* Impersonation Banner */}
            {viewingUserId && (
              <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-[10px] uppercase tracking-widest font-black py-2 text-center z-[110] flex items-center justify-center gap-4">
                Watching User Profile: {viewingUserId}
                <button 
                  onClick={() => { setViewingUserId(null); setCurrentView('admin'); }}
                  className="bg-white text-blue-600 px-3 py-1 rounded-full text-[9px] hover:bg-stone-100 transition-colors"
                >
                  Exit View
                </button>
              </div>
            )}

            <AnimatePresence>
              {kpiAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -100 }}
                  className="fixed top-0 left-0 right-0 z-[250] flex justify-center p-4 pointer-events-none"
                >
                  <div className={cn(
                    "px-6 py-4 rounded shadow-2xl font-bold text-sm tracking-wide max-w-lg pointer-events-auto flex items-center gap-3 border",
                    isAdmin ? "cyber-panel bg-black border-red-500/50 text-red-500 mono italic" : "bg-red-950 border-red-900 text-red-500"
                  )}>
                    <span className={cn("w-2 h-2 rounded-full animate-pulse", isAdmin ? "bg-red-500" : "bg-red-500")} />
                    {isAdmin ? `CRITICAL_ALERT :: ${kpiAlert}` : kpiAlert}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Admin Global Overlay */}
            {isAdmin && (
              <div className="fixed inset-0 pointer-events-none z-[50] overflow-hidden opacity-[0.03]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                <div className="absolute inset-0 animate-scanline bg-[linear-gradient(0deg,transparent_0%,rgba(197,160,89,0.2)_50%,transparent_100%)] bg-[length:100%_100px] bg-no-repeat" />
              </div>
            )}

            {/* User Warning Popup */}
            <AnimatePresence>
              {profile?.warning && dismissedWarning !== profile.warning && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full max-w-md bg-card-bg border border-yellow-500/30 p-8 rounded shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl" />
                    <div className="relative z-10 text-center">
                      <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8 text-yellow-500" />
                      </div>
                      <h3 className="text-2xl serif font-black text-red-500 mb-4 uppercase tracking-[0.4em]">WARNING</h3>
                      <p className="text-xs text-stone-300 leading-relaxed mb-8 italic">
                        {profile.warning === 'please valid user name use korun .aponar username o full name unujayi apni ekjon fake user tai aponar account 24 ghontar moddhe ban kore deuya hobe.' 
                          ? 'Please use a valid username. According to your username and full name, you have been identified as a fake user. Therefore, your account will be banned within 24 hours.' 
                          : profile.warning}
                      </p>
                      <button 
                        onClick={closeWarning}
                        className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] uppercase tracking-[0.2em] font-black transition-all rounded shadow-lg shadow-blue-900/20"
                      >
                        CLOSE
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <Sidebar 
              currentView={currentView} 
              isAdminMode={isAdmin}
              rank={profile?.rank}
              setView={(v) => { 
                if (v === 'kpi' && !isAdmin) {
                  navigateToKpi();
                } else {
                  setCurrentView(v); 
                }
              }} 
            />

            <MobileNavigation 
              currentView={currentView}
              isAdminMode={isAdmin}
              rank={profile?.rank}
              setView={(v) => { 
                if (v === 'kpi' && !isAdmin) {
                  navigateToKpi();
                } else {
                  setCurrentView(v); 
                }
              }}
            />
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header 
              username={isAdmin ? 'BD-GX' : (profile?.username || (user?.email && user.email.includes('@') ? user.email.split('@')[0].toUpperCase() : 'User'))} 
                name={profile?.name} 
                rank={profile?.rank}
                isAdmin={isAdmin}
                photoURL={profile?.photoURL}
                verified={profile?.verified}
                onLogout={handleLogout} 
              />
              
              <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentView + (viewingUserId || '') + selectedMonth}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-7xl mx-auto w-full"
                  >
                    {currentView === 'admin' && isAdmin && (
                      <AdminDashboard onViewUser={(uid) => { setViewingUserId(uid); setCurrentView('dashboard'); }} />
                    )}
                    {currentView === 'kpi_amount_set' && isAdmin && (
                      <AdminKPISet />
                    )}
                    {currentView === 'user_management' && isAdmin && (
                      <UserManagement />
                    )}
                    {currentView === 'dashboard' && effectiveUserId && (
                      <Dashboard userId={effectiveUserId} month={selectedMonth} />
                    )}
                    {currentView === 'salary' && effectiveUserId && (
                      <Salary userId={effectiveUserId} />
                    )}
                    {currentView === 'attendance' && effectiveUserId && (
                      <Attendance 
                        userId={effectiveUserId} 
                        month={selectedMonth} 
                        onMonthChange={setSelectedMonth}
                      />
                    )}
                    {currentView === 'accuracy' && effectiveUserId && (
                      <Accuracy userId={effectiveUserId} />
                    )}
                    {currentView === 'kpi' && effectiveUserId && (
                      <KPI userId={effectiveUserId} month={selectedMonth} />
                    )}
                    {currentView === 'history' && effectiveUserId && (
                      <History 
                        userId={effectiveUserId} 
                        onMonthSelect={(m) => { setSelectedMonth(m); setCurrentView('dashboard'); }} 
                      />
                    )}
                    {currentView === 'roster' && profile?.username && (
                      <UserRoster username={profile.username} rank={profile.rank || 'Agent'} />
                    )}
                    {currentView === 'admin_roster' && isAdmin && (
                      <AdminRosterConfig />
                    )}
                    {currentView === 'verification_requests' && (isAdmin || profile?.rank === 'TL') && (
                      <VerificationRequests 
                        isAdmin={isAdmin} 
                        viewerRank={profile?.rank} 
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </main>

              {user && profile && (
                <Chat currentUser={{ 
                  uid: user.uid, 
                  username: profile.username || '', 
                  rank: profile.rank || 'Agent' 
                }} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
