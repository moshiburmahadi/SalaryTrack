import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updatePassword
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Terminal, ShieldAlert, Cpu, Zap, Activity, Database, Lock, Fingerprint, Search, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface AuthProps {
  onAuthSuccess: () => void;
  onAdminSuccess: () => void;
}

export default function Auth({ onAuthSuccess, onAdminSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [rank, setRank] = useState<'Agent' | 'QA' | 'TL'>('Agent');
  const [password, setPassword] = useState('');

  const ADMIN_PASSWORD = 'netster';


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isAdminLogin) {
      if (password === ADMIN_PASSWORD) {
        try {
          const adminEmail = 'bd-gx@tracker.app';
          let userCredential;
          
          try {
            // Attempt to sign in as the root authority
            userCredential = await signInWithEmailAndPassword(auth, adminEmail, password);
            console.log('System: Root authority verified successfully.');
          } catch (signInErr: any) {
            // Handle new system initialization or password mismatch
            if (signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/user-not-found') {
              try {
                console.log('System: Admin identity not found. Initiating root generation...');
                userCredential = await createUserWithEmailAndPassword(auth, adminEmail, password);
                console.log('System: Root authority generated.');
              } catch (createErr: any) {
                // If creation fails with already-in-use, it means the password provided is wrong for the existing account
                if (createErr.code === 'auth/email-already-in-use') {
                  throw new Error('Identity Conflict: The root account exists but the security code is incorrect.');
                }
                throw createErr;
              }
            } else {
              throw signInErr;
            }
          }
          
          const docRef = doc(db, 'users', userCredential.user.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            await setDoc(docRef, {
              name: 'Administrator',
              username: 'BD-GX',
              password: password, // Save admin password
              createdAt: serverTimestamp(),
              isAdmin: true
            });
          } else {
            // Update admin password if it's different/missing
            if (docSnap.data()?.password !== password) {
              await updateDoc(docRef, { password: password });
            }
          }
          onAdminSuccess();
        } catch (err: any) {
          console.error('Admin Auth Diagnostic:', err.code, err.message);
          setError(err.message || 'Administrator authentication failed. System check required.');
        } finally {
          setLoading(false);
        }
      } else {
        setError('Unauthorized: Incorrect Administrator Password');
        setLoading(false);
      }
      return;
    }

    const rawUsername = username.trim();
    let internalEmail = '';
    
    if (rawUsername.includes('@')) {
      internalEmail = rawUsername.toLowerCase();
    } else {
      // Preserve spaces in the middle to maintain compatibility with legacy accounts
      const formattedUsername = rawUsername.toUpperCase();
      if (!formattedUsername.startsWith('BD-GX') && !isAdminLogin) {
        setError('Requirement: Username must start with BD-GX (e.g. BD-GX-01)');
        setLoading(false);
        return;
      }
      // Use underscores for internal email to ensure it's a valid format for Firebase Auth
      internalEmail = `${formattedUsername.toLowerCase().replace(/\s/g, '_')}@tracker.app`;
    }

    // Helper for generating the internal Auth password (different from the user's "Security Code")
    const getSystemSecret = (uname: string) => `SYS_AUTH_${uname.toUpperCase().replace(/\s/g, '_')}_2026`;

    try {
      if (isLogin) {
        // 1. GATEKEEPER CHECK: Verify against Firestore first
        const q = query(collection(db, 'users'), where('username', '==', rawUsername.toUpperCase()));
        const querySnapshot = await getDocs(q);
        
        let firestoreUser: any = null;
        if (!querySnapshot.empty) {
          firestoreUser = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
          
          if (firestoreUser.password && firestoreUser.password !== password) {
            throw new Error('Access Denied: The security code provided does not match our current registry.');
          }
        }

        try {
          // 2. ATTEMPT LOGIN
          // We try three ways to handle transitions:
          // A. System Secret (New Standard)
          // B. Real Password (Legacy/Current)
          // C. Re-registration (If Admin changed pass and we are out of sync)
          
          let userCredential;
          const systemSecret = getSystemSecret(rawUsername);
          
          try {
            userCredential = await signInWithEmailAndPassword(auth, internalEmail, systemSecret);
          } catch (errA: any) {
            try {
              userCredential = await signInWithEmailAndPassword(auth, internalEmail, password);
              // If this worked, upgrade them to the system secret
              // This is safe because we verified their password against Firestore in step 1
              if (userCredential.user) {
                await updatePassword(userCredential.user, systemSecret);
                console.log('System: Credentials migrated to high-security sync mode.');
              }
            } catch (errB: any) {
              // If both failed but we matched the Firestore password, it means the Auth account is out of sync
              // or hasn't been created yet.
              if (firestoreUser && firestoreUser.password === password) {
                throw new Error('Security Desync Detected: An Administrator has recently updated your credentials. To re-establish access, please contact Administrator to perform a System ID Reset (Delete/Recreate Account).');
              }
              throw errB;
            }
          }

          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data?.isBanned) {
              await signOut(auth);
              setError('Security Protocol: Access Denied. This terminal is prohibited.');
              setLoading(false);
              return;
            }

            // Sync password in Firestore if it's different (should be rare now)
            if (data?.password !== password) {
              await updateDoc(doc(db, 'users', userCredential.user.uid), { password });
            }
          }
        } catch (signInErr: any) {
          console.error('Sign-in Failure Details:', {
            identifier: internalEmail,
            code: signInErr.code,
            message: signInErr.message
          });
          
          // If they are trying the admin password on a regular login, guide them
          if (password === ADMIN_PASSWORD && !isAdminLogin) {
            throw new Error('Verification Error: This security code is reserved for Administrators. Please use the "Administrator Access" link below.');
          }
          
          // Enhanced guidance for the specific invalid-credential error
          if (signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/wrong-password') {
            let advice = 'Verification Failed: The identifier or security code is incorrect.';
            
            if (isLogin) {
              advice += ' If you haven\'t created this account yet, please toggle to "Register" mode below.';
              if (internalEmail.includes('moshibur.mahadi')) {
                advice += ' Tip: As the system owner, ensure you have registered your email with a security code first.';
              }
            } else {
              advice = 'Registration Denied: This identity cannot be created. Ensure the security code is at least 6 characters and the system provider is active.';
            }
            throw new Error(advice);
          }
          
          if (signInErr.code === 'auth/operation-not-allowed') {
            throw new Error('System Configuration Alert: Email authentication provider is not enabled in the Firebase Console. An Administrator must enable it.');
          }
          
          throw signInErr;
        }
      } else {
        console.log(`System: Creating new registry for: ${internalEmail}`);
        const systemSecret = getSystemSecret(rawUsername);
        const userCredential = await createUserWithEmailAndPassword(auth, internalEmail, systemSecret);
        
        // When registering, we save the formatted name and username
        // but we keep the internal identifier clean (no spaces)
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: name.trim(),
          username: rawUsername.toUpperCase(), // Display name preserves intent (e.g. "BD-GX 685")
          rank: rank,
          password: password, // Store password for retrieval
          createdAt: serverTimestamp()
        }, { merge: true });
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error('Core Auth Diagnostics:', err.code, err.message);
      
      const errorMessage = err.message || 'Access procedure interrupted.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center px-4 selection:bg-gold-accent/30 selection:text-gold-accent transition-colors duration-1000",
      isAdminLogin ? "bg-black" : "bg-dark-bg"
    )}>
      {/* Background Cyber Grid */}
      <div className={cn(
        "fixed inset-0 cyber-grid pointer-events-none transition-opacity duration-1000",
        isAdminLogin ? "opacity-20" : "opacity-5"
      )} />
      
      <motion.div 
        key={isAdminLogin ? 'admin-box' : 'user-box'}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "max-w-md w-full p-10 shadow-2xl relative overflow-hidden transition-all duration-500",
          isAdminLogin 
            ? "cyber-panel hud-corner border-gold-accent shadow-gold-accent/5" 
            : "bg-card-bg rounded border border-border-dark"
        )}
      >
        {isAdminLogin && (
          <div className="absolute top-0 right-0 p-2">
            <div className="w-1.5 h-1.5 bg-gold-accent animate-pulse rounded-full" />
          </div>
        )}

        <div className="text-center mb-10 relative z-10">
          <h1 className={cn(
            "text-4xl font-bold tracking-tight text-center transition-all",
            isAdminLogin ? "mono italic text-white" : "serif text-white"
          )}>
            {isAdminLogin ? "MAINFRAME" : "Salary"}<span className={cn(isAdminLogin ? "text-gold-accent underline underline-offset-8" : "gold-accent font-light italic")}>{isAdminLogin ? "ACCESS" : "Track"}</span>
          </h1>
          
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              {isAdminLogin ? <ShieldAlert className="w-4 h-4 text-gold-accent animate-cyber-flicker" /> : <Lock className="w-3.5 h-3.5 text-stone-700" />}
              <p className={cn(
                "uppercase tracking-[0.4em] font-black",
                isAdminLogin ? "mono text-[10px] text-gold-accent" : "text-[9px] text-stone-500"
              )}>
                {isAdminLogin ? 'LEVEL_ZERO_VALIDATION' : (isLogin ? 'Authentication Required' : 'Node Initialization')}
              </p>
            </div>
            
            {isAdminLogin && (
              <div className="bg-gold-accent/5 border border-gold-accent/20 px-3 py-1 rounded-sm">
                <p className="text-[8px] mono uppercase text-gold-accent/70 font-black tracking-widest animate-pulse italic">
                  Root_Authority_Challenge_Active
                </p>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {!isLogin && !isAdminLogin && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Registry Name" 
                  required
                  className="w-full px-4 py-4 bg-black/40 border border-border-dark rounded focus:border-gold-accent outline-none transition-all text-sm text-white font-medium placeholder:text-stone-800"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="relative group">
                <label className="text-[9px] mono uppercase tracking-widest text-stone-600 font-black block mb-2 px-1">Assign_Node_Rank</label>
                <div className="relative">
                  <select 
                    className="w-full px-4 py-4 bg-black/40 border border-border-dark rounded focus:border-gold-accent outline-none transition-all text-sm text-white font-black appearance-none uppercase mono italic tracking-widest cursor-pointer"
                    value={rank}
                    onChange={(e) => setRank(e.target.value as any)}
                  >
                    <option value="Agent">_AGENT</option>
                    <option value="QA">_QA_VAL</option>
                    <option value="TL">_TEAM_LEAD</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-xs">▼</div>
                </div>
              </div>
            </motion.div>
          )}
          
          {!isAdminLogin && (
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <UserIcon className="w-4 h-4 text-stone-700" />
                </div>
                <input 
                  type="text" 
                  placeholder="UID (BD-GX-XX)" 
                  required
                  className="w-full pl-12 pr-4 py-4 bg-black/40 border border-border-dark rounded focus:border-gold-accent outline-none transition-all text-sm text-white font-black placeholder:text-stone-800 uppercase mono italic tracking-widest"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              
              {username.trim() && (
                <div className="px-1 flex items-center justify-between opacity-40">
                  <span className="text-[8px] mono uppercase text-stone-600 font-bold">UPLINK_ADDR:</span>
                  <span className="text-[8px] mono text-stone-500 lowercase truncate italic">
                    {username.includes('@') ? username.toLowerCase() : `${username.toUpperCase().toLowerCase().replace(/\s/g, '_')}@tracker.app`}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {isAdminLogin && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="cyber-panel p-5 bg-gold-accent/[0.03] border-gold-accent/20 mb-6 flex items-center gap-4"
            >
              <Fingerprint className="w-8 h-8 text-gold-accent animate-cyber-flicker" />
              <div>
                <p className="text-[10px] mono uppercase text-gold-accent font-black tracking-[0.2em] italic">ADMIN_ID: BD-GX</p>
                <p className="text-[8px] mono text-stone-600 uppercase font-bold tracking-tighter">Identity_Hashing_Enabled</p>
              </div>
            </motion.div>
          )}

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Fingerprint className={cn("w-4 h-4 transition-colors", isAdminLogin ? "text-gold-accent" : "text-stone-700")} />
            </div>
            <input 
              type="password" 
              placeholder={isAdminLogin ? "SECURITY_LOCK_KEY" : "AUTH_CODE"}
              required
              className={cn(
                "w-full pl-12 pr-4 py-4 bg-black/40 border outline-none transition-all text-sm text-white font-black placeholder:text-stone-800 mono tracking-[0.4em]",
                isAdminLogin ? "border-gold-accent/40 focus:border-gold-accent italic" : "border-border-dark focus:border-gold-accent"
              )}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-red-950/20 text-red-500 text-[9px] mono uppercase font-black border border-red-900/40 space-y-2 italic overflow-hidden"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3" />
                  <p>SYSTEM_ALERT :: {error}</p>
                </div>
                {error.includes('Firebase Console') && (
                  <a 
                    href="https://console.firebase.google.com/project/ai-studio-applet-webapp-f1e30/authentication/providers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block text-gold-accent hover:underline mt-2 tracking-tighter"
                  >
                    RESOLVE_VIA_CONSOLE_UPLINK →
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit" 
            disabled={loading}
            className={cn(
              "w-full py-5 font-black uppercase tracking-[0.4em] text-[11px] transition-all flex items-center justify-center group relative overflow-hidden italic shadow-2xl",
              isAdminLogin 
                ? "bg-gold-accent text-black hover:bg-gold-accent/90" 
                : "bg-gold-accent/10 border border-gold-accent/40 text-gold-accent hover:bg-gold-accent hover:text-black"
            )}
          >
            {isAdminLogin && <div className="absolute top-0 right-0 w-12 h-[1px] bg-white opacity-40" />}
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <div className="flex items-center gap-3">
                {isAdminLogin ? <Zap className="w-4 h-4 fill-current" /> : <Activity className="w-4 h-4" />}
                <span>
                  {isAdminLogin ? 'INITIALIZE_COMMAND' : (isLogin ? 'ESTABLISH_LINK' : 'GENERATE_ENTRY')}
                </span>
              </div>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-stone-900 flex flex-col items-center gap-5 relative z-10">
          {!isAdminLogin ? (
            <div className="text-center text-[10px] mono font-black uppercase tracking-[0.2em] text-stone-600 italic">
              {isLogin ? "No registry ID?" : "Identified user?"}{' '}
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-gold-accent hover:text-white transition-all ml-2 underline underline-offset-4 decoration-gold-accent/30"
              >
                {isLogin ? 'CREATE_NODE' : 'ACCESS_TERMINAL'}
              </button>
            </div>
          ) : (
             <div className="flex items-center gap-3">
               <Cpu className="w-3 h-3 text-stone-800 animate-pulse" />
               <p className="text-[10px] mono text-stone-800 uppercase font-black italic tracking-widest">Secured_Line_Enabled</p>
             </div>
          )}

          <button 
            onClick={() => { setIsAdminLogin(!isAdminLogin); setError(''); }}
            className={cn(
              "text-[9px] mono uppercase tracking-[0.3em] transition-all font-black italic border-b border-transparent hover:border-current",
              isAdminLogin ? "text-stone-700 hover:text-gold-accent" : "text-stone-700 hover:text-gold-accent"
            )}
          >
            {isAdminLogin ? "← RETURN_TO_USER_GATE" : "ADMIN_COMMAND_OVERRIDE"}
          </button>
        </div>
        
        {isAdminLogin && (
          <div className="mt-8 flex justify-center gap-4 opacity-10 grayscale">
            <span className="mono text-[8px] font-black text-white px-2 py-1 border border-white rounded-sm">V.ALPHA</span>
            <span className="mono text-[8px] font-black text-white px-2 py-1 border border-white rounded-sm">ENCR_256</span>
            <span className="mono text-[8px] font-black text-white px-2 py-1 border border-white rounded-sm">ROOT_MODE</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
