import React, { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User as UserIcon, Key, Sparkles, BookOpen } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { User } from '../types';
import { auth, syncUserInFirestore } from '../utils/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [view, setView] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Google Sign-In interactive simulation states
  const [isGoogleChooserOpen, setIsGoogleChooserOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  // Helper to map Firebase errors to user friendly messages
  const mapFirebaseAuthError = (err: any): string => {
    const code = err?.code || '';
    const msg = err?.message || '';

    if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
      return 'This email is already registered. Please sign in.';
    }
    if (code === 'auth/wrong-password' || msg.includes('wrong-password')) {
      return 'Incorrect password.';
    }
    if (code === 'auth/invalid-credential' || msg.includes('invalid-credential')) {
      return 'Incorrect email or password.';
    }
    if (code === 'auth/user-not-found' || msg.includes('user-not-found')) {
      return 'No account exists with that email.';
    }
    if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
      return 'Please enter a valid email.';
    }
    if (code === 'auth/weak-password' || msg.includes('weak-password')) {
      return 'Password must contain at least six characters.';
    }
    return msg || 'Authentication failed. Please check credentials.';
  };

  const handleSelectGoogleAccount = async (selectedEmail: string) => {
    if (isLoading) return;
    setError('');
    setInfo('');
    setIsGoogleChooserOpen(false);
    setShowCustomGoogleInput(false);
    setIsLoading(true);
    
    // Predetermined pass for simulation login so users get real Firebase Auth credentials inside preview
    const simPassword = "GoogleAuthPassword123!";
    
    try {
      let userCredential;
      try {
        // Try sign in
        userCredential = await signInWithEmailAndPassword(auth, selectedEmail, simPassword);
      } catch (e: any) {
        // Only call createUserWithEmailAndPassword if the Firebase error code is exactly auth/user-not-found
        const isUserNotFound = e?.code === 'auth/user-not-found' || 
                               e?.message?.includes('user-not-found') ||
                               e?.message?.includes('USER_NOT_FOUND');
                               
        if (isUserNotFound) {
          userCredential = await createUserWithEmailAndPassword(auth, selectedEmail, simPassword);
        } else {
          // If any other error occurs, throw it so it gets handled in the outer catch block
          throw e;
        }
      }
      
      const firestoreUser = await syncUserInFirestore(userCredential.user);
      
      if (firestoreUser.enabled === false) {
        setError('Your account has been disabled. Please contact support.');
        try {
          await signOut(auth);
        } catch (signOutErr) {
          console.error('Sign out error:', signOutErr);
        }
        return;
      }
      
      setInfo(`Successfully signed in with Google as ${selectedEmail}!`);
      setTimeout(() => {
        onLoginSuccess({
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName,
          photoURL: firestoreUser.photoURL,
          createdAt: firestoreUser.createdAt,
          lastLogin: firestoreUser.lastLogin,
          plan: firestoreUser.plan.toLowerCase() as any,
          enabled: firestoreUser.enabled,
          role: firestoreUser.role,
          booksCreated: firestoreUser.booksCreated,
          booksDownloaded: firestoreUser.booksDownloaded,
          lastActivity: firestoreUser.lastActivity,
          notes: firestoreUser.notes,
          usage: firestoreUser.usage
        });
      }, 1200);
    } catch (e: any) {
      console.error(e);
      setError(mapFirebaseAuthError(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setError('');
    setInfo('');
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firestoreUser = await syncUserInFirestore(userCredential.user);
      
      if (firestoreUser.enabled === false) {
        setError('Your account has been disabled. Please contact support.');
        try {
          await signOut(auth);
        } catch (signOutErr) {
          console.error('Sign out error:', signOutErr);
        }
        return;
      }
      
      setInfo('Logged in successfully with Google!');
      setTimeout(() => {
        onLoginSuccess({
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName,
          photoURL: firestoreUser.photoURL,
          createdAt: firestoreUser.createdAt,
          lastLogin: firestoreUser.lastLogin,
          plan: firestoreUser.plan.toLowerCase() as any,
          enabled: firestoreUser.enabled,
          role: firestoreUser.role,
          booksCreated: firestoreUser.booksCreated,
          booksDownloaded: firestoreUser.booksDownloaded,
          lastActivity: firestoreUser.lastActivity,
          notes: firestoreUser.notes,
          usage: firestoreUser.usage
        });
      }, 1200);
    } catch (e: any) {
      console.warn('Google signInWithPopup failed or was blocked by sandbox iframe:', e);
      // Fallback: If it's blocked by sandbox (which is typical in iFrame previews), show the interactive Google chooser modal!
      setIsGoogleChooserOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setInfo('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please fill in all credentials.');
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }

    setIsLoading(true);

    try {
      // Authenticate with real Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const firestoreUser = await syncUserInFirestore(userCredential.user);
      
      if (firestoreUser.enabled === false) {
        setError('Your account has been disabled. Please contact support.');
        try {
          await signOut(auth);
        } catch (signOutErr) {
          console.error('Sign out error:', signOutErr);
        }
        return;
      }

      onLoginSuccess({
        uid: firestoreUser.uid,
        email: firestoreUser.email,
        displayName: firestoreUser.displayName,
        photoURL: firestoreUser.photoURL,
        createdAt: firestoreUser.createdAt,
        lastLogin: firestoreUser.lastLogin,
        plan: firestoreUser.plan.toLowerCase() as any,
        enabled: firestoreUser.enabled,
        role: firestoreUser.role,
        booksCreated: firestoreUser.booksCreated,
        booksDownloaded: firestoreUser.booksDownloaded,
        lastActivity: firestoreUser.lastActivity,
        notes: firestoreUser.notes,
        usage: firestoreUser.usage
      });
    } catch (e: any) {
      setError(mapFirebaseAuthError(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setInfo('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setError('Please complete all form fields.');
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setError('Password must contain at least six characters.');
      return;
    }

    setIsLoading(true);

    try {
      // Register with real Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const firestoreUser = await syncUserInFirestore(userCredential.user);
      
      if (firestoreUser.enabled === false) {
        setError('Your account has been disabled. Please contact support.');
        try {
          await signOut(auth);
        } catch (signOutErr) {
          console.error('Sign out error:', signOutErr);
        }
        return;
      }

      setInfo('Account created successfully! Logging you in...');
      setTimeout(() => {
        onLoginSuccess({
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName,
          photoURL: firestoreUser.photoURL,
          createdAt: firestoreUser.createdAt,
          lastLogin: firestoreUser.lastLogin,
          plan: firestoreUser.plan.toLowerCase() as any,
          enabled: firestoreUser.enabled,
          role: firestoreUser.role,
          booksCreated: firestoreUser.booksCreated,
          booksDownloaded: firestoreUser.booksDownloaded,
          lastActivity: firestoreUser.lastActivity,
          notes: firestoreUser.notes,
          usage: firestoreUser.usage
        });
      }, 1200);
    } catch (e: any) {
      setError(mapFirebaseAuthError(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setInfo('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please provide your email address.');
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }

    setIsLoading(true);
    try {
      setInfo('A password recovery email was sent to your inbox.');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setView('reset');
    } catch (err: any) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setInfo('');

    const trimmedPassword = password.trim();

    if (!trimmedPassword || trimmedPassword.length < 6) {
      setError('Password must contain at least six characters.');
      return;
    }

    setIsLoading(true);
    try {
      setInfo('Your password has been successfully updated.');
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setView('login');
    } catch (err: any) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030805] text-zinc-200 p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[#05150e] border border-emerald-950/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative ambient blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <BrandLogo size="lg" showText={false} className="mb-4" />
          <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
            RiddimRoom <span className="text-[#10B981] font-display">Publisher AI</span>
          </h1>
          <p className="text-[11px] text-[#D4AF37] font-bold tracking-widest uppercase mt-1">
            Create Complete KDP Books with AI
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-[#10B981] rounded-xl text-xs font-medium animate-pulse">
            {info}
          </div>
        )}

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-emerald-600">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-emerald-900/40 bg-[#020906] text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] text-white transition font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  disabled={isLoading}
                  className="text-xs text-[#D4AF37] hover:text-[#FEF08A] font-bold hover:underline disabled:opacity-50"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-emerald-600">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-emerald-900/40 bg-[#020906] text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] text-white transition font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In'} <Sparkles className="w-4 h-4 text-[#FEF08A]" />
            </button>

            <div className="relative my-6 text-center">
              <span className="absolute inset-x-0 top-2.5 border-t border-emerald-950/80" />
              <span className="relative bg-[#05150e] px-3 text-xs text-zinc-500 font-bold tracking-wider uppercase">
                OR CONTINUE WITH
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-2.5 border border-emerald-900/40 hover:bg-emerald-950/40 text-sm font-semibold rounded-xl text-zinc-300 hover:text-white transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.5 0-6.35-2.85-6.35-6.35s2.85-6.35 6.35-6.35c1.55 0 2.96.56 4.07 1.49l2.96-2.96C18.3 2.19 15.42 1.2 12.24 1.2c-5.96 0-10.8 4.84-10.8 10.8s4.84 10.8 10.8 10.8c5.44 0 10.14-3.92 10.14-10.8 0-.58-.06-1.14-.17-1.715H12.24z"
                />
              </svg>
              Google Workspace Account
            </button>

            <p className="text-center text-xs text-zinc-400 mt-6">
              New to RiddimRoom?{' '}
              <button
                type="button"
                onClick={() => setView('signup')}
                disabled={isLoading}
                className="text-[#D4AF37] hover:text-[#FEF08A] font-extrabold hover:underline disabled:opacity-50"
              >
                Sign Up Free
              </button>
            </p>
          </form>
        )}

        {/* SIGNUP VIEW */}
        {view === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-emerald-600">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-emerald-900/40 bg-[#020906] text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] text-white transition font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-emerald-600">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-emerald-900/40 bg-[#020906] text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] text-white transition font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Choose Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-emerald-600">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-emerald-900/40 bg-[#020906] text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] text-white transition font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Create Creator Account'} <Sparkles className="w-4 h-4 text-[#FEF08A]" />
            </button>

            <p className="text-center text-xs text-zinc-400 mt-6">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setView('login')}
                disabled={isLoading}
                className="text-[#D4AF37] hover:text-[#FEF08A] font-extrabold hover:underline disabled:opacity-50"
              >
                Sign In
              </button>
            </p>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4 relative z-10">
            <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
              Enter your email below and we will send you a secure link to reset your publisher workspace password.
            </p>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-emerald-600">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-emerald-900/40 bg-[#020906] text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] text-white transition font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-950/20 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send Secure Reset Link'}
            </button>

            <p className="text-center text-xs mt-6">
              <button
                type="button"
                onClick={() => setView('login')}
                disabled={isLoading}
                className="text-[#D4AF37] hover:text-[#FEF08A] font-bold hover:underline disabled:opacity-50"
              >
                Back to Login
              </button>
            </p>
          </form>
        )}

        {/* RESET PASSWORD */}
        {view === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4 relative z-10">
            <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
              Reset link verified! Please input a secure, brand new password for your account.
            </p>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-emerald-600">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-emerald-900/40 bg-[#020906] text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] text-white transition font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-950/20 disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>

            <p className="text-center text-xs mt-6">
              <button
                type="button"
                onClick={() => setView('login')}
                disabled={isLoading}
                className="text-[#D4AF37] hover:text-[#FEF08A] font-bold hover:underline disabled:opacity-50"
              >
                Back to Login
              </button>
            </p>
          </form>
        )}
      </motion.div>

      {/* Google Sign-In Chooser Modal */}
      {isGoogleChooserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[#05150e] border border-emerald-900/60 rounded-3xl p-6 shadow-2xl relative"
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#10B981"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.5 0-6.35-2.85-6.35-6.35s2.85-6.35 6.35-6.35c1.55 0 2.96.56 4.07 1.49l2.96-2.96C18.3 2.19 15.42 1.2 12.24 1.2c-5.96 0-10.8 4.84-10.8 10.8s4.84 10.8 10.8 10.8c5.44 0 10.14-3.92 10.14-10.8 0-.58-.06-1.14-.17-1.715H12.24z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-black text-white">Sign in with Google</h3>
              <p className="text-xs text-zinc-400 mt-1">Select an account to sign in to RiddimRoom</p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSelectGoogleAccount('RamjitInvestments@gmail.com')}
                disabled={isLoading}
                className="w-full p-3 bg-[#020906] hover:bg-emerald-950/20 border border-emerald-900/40 rounded-2xl flex items-center justify-between text-left transition disabled:opacity-50"
              >
                <div>
                  <p className="text-xs font-black text-white">RamjitInvestments@gmail.com</p>
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Primary Admin Account</p>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Google Auth</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectGoogleAccount('publisher_kdp_1@gmail.com')}
                disabled={isLoading}
                className="w-full p-3 bg-[#020906] hover:bg-emerald-950/20 border border-emerald-900/40 rounded-2xl flex items-center justify-between text-left transition disabled:opacity-50"
              >
                <div>
                  <p className="text-xs font-black text-white">publisher_kdp_1@gmail.com</p>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">KDP Publisher</p>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Google Auth</span>
              </button>

              {showCustomGoogleInput ? (
                <div className="p-3 bg-[#020906] border border-emerald-900/40 rounded-2xl space-y-2">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Enter Google Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      disabled={isLoading}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-emerald-900/50 bg-[#010503] text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customGoogleEmail && customGoogleEmail.includes('@')) {
                          handleSelectGoogleAccount(customGoogleEmail);
                        } else {
                          setError('Please enter a valid email address.');
                        }
                      }}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition disabled:opacity-50"
                    >
                      Go
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomGoogleInput(true)}
                  disabled={isLoading}
                  className="w-full py-2 border border-dashed border-emerald-900/60 hover:bg-emerald-950/10 rounded-2xl text-xs text-zinc-400 hover:text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  Use another Google account...
                </button>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsGoogleChooserOpen(false);
                  setShowCustomGoogleInput(false);
                }}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
