import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, UserPlus, LogIn, Zap, ArrowRight, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { AuthUser } from '../types';
import { LandingPage } from './LandingPage';
import { useFirebaseAuth, firebaseUserToAuthUser } from '../services/useFirebaseAuth';
import { getAuthErrorMessage, isFirebaseConfigured } from '../services/firebase';

interface LoginScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'landing'>('landing');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Firebase auth hook
  const {
    user: firebaseUser,
    loading: firebaseLoading,
    error: firebaseError,
    signInWithGoogle,
    signOut,
    clearError: clearFirebaseError,
  } = useFirebaseAuth();

  // Handle Firebase user authentication
  useEffect(() => {
    if (firebaseUser) {
      const authUser = firebaseUserToAuthUser(firebaseUser);
      // Store Firebase token for API calls
      firebaseUser.getIdToken().then((token: string) => {
        localStorage.setItem('firebase_token', token);
      });
      onAuthenticated(authUser);
    }
  }, [firebaseUser, onAuthenticated]);

  // Handle Firebase errors
  useEffect(() => {
    if (firebaseError) {
      setError(firebaseError);
    }
  }, [firebaseError]);

  // Clear error when mode changes
  useEffect(() => {
    setError('');
    setSuccessMessage('');
    clearFirebaseError();
  }, [mode, clearFirebaseError]);

  // Traditional auth handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (mode === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!username || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Handle specific error codes
        const errorMsg = data.error || 'Authentication failed.';
        
        if (errorMsg.includes('username') && errorMsg.includes('already')) {
          setError('This username is already taken. Please choose a different one.');
        } else if (errorMsg.includes('password')) {
          setError('Password must be between 8 and 128 characters.');
        } else if (errorMsg.includes('Too many')) {
          setError('Too many login attempts. Please wait a few minutes and try again.');
        } else if (errorMsg.includes('Invalid')) {
          setError('Invalid username or password. Please check your credentials.');
        } else {
          setError(errorMsg);
        }
        return;
      }

      // Success
      if (mode === 'register') {
        setSuccessMessage('Account created successfully! You can now sign in.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        onAuthenticated(data.user);
      }
    } catch (err) {
      setError('Could not reach the Sentinel server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google sign-in handler
  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMessage('');
    
    if (!isFirebaseConfigured()) {
      setError('Google Sign-In is not configured. Please contact the administrator.');
      return;
    }

    try {
      const user = await signInWithGoogle();
      if (user) {
        setSuccessMessage(`Welcome, ${user.displayName || user.email}!`);
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  if (mode === 'landing') {
    return (
      <>
        <LandingPage onGetStarted={() => setMode('login')} />
        <div className="fixed bottom-4 right-4 flex items-center gap-2">
          <button
            onClick={() => setMode('login')}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-dim)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-base font-semibold text-white">Sentinel</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}>IDE</span>
        </div>

        <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--error)' }} />
              <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'var(--success-bg)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />
              <p className="text-xs" style={{ color: 'var(--success)' }}>{successMessage}</p>
            </div>
          )}

          {/* Google Sign-In Button */}
          {isFirebaseConfigured() && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={firebaseLoading || isSubmitting}
                className="w-full flex items-center justify-center gap-3 rounded-md py-2.5 px-4 text-sm font-medium mb-4 cursor-pointer disabled:opacity-50"
                style={{ 
                  backgroundColor: 'white', 
                  color: '#333',
                  border: '1px solid #ddd',
                }}
              >
                {firebaseLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>or</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              </div>
            </>
          )}

          {/* Traditional Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Username <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                id="auth-username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md px-3 py-2.5 text-sm"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)', 
                  border: '1px solid var(--border)', 
                  color: 'var(--text-primary)', 
                  outline: 'none',
                }}
                placeholder="analyst"
                required
              />
              {mode === 'register' && (
                <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  3-32 characters, letters, numbers, underscores only
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Password <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md px-3 py-2.5 text-sm"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)', 
                  border: '1px solid var(--border)', 
                  color: 'var(--text-primary)', 
                  outline: 'none',
                }}
                placeholder={mode === 'login' ? '••••••••' : 'Min 8 characters'}
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Confirm Password <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md px-3 py-2.5 text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)', 
                    border: '1px solid var(--border)', 
                    color: 'var(--text-primary)', 
                    outline: 'none',
                  }}
                  placeholder="••••••••"
                  required
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-[10px]" style={{ color: 'var(--error)' }}>
                    Passwords do not match
                  </p>
                )}
              </div>
            )}

            <button
              id="auth-submit"
              type="submit"
              disabled={isSubmitting || (mode === 'register' && password !== confirmPassword)}
              className="w-full flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <><LogIn className="w-4 h-4" /><span>Sign in</span></>
              ) : (
                <><UserPlus className="w-4 h-4" /><span>Create account</span></>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              {mode === 'login' ? "No account?" : 'Already registered?'}
            </p>
            <button
              type="button"
              id="auth-toggle-mode"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccessMessage(''); }}
              className="font-medium cursor-pointer"
              style={{ color: 'var(--accent)' }}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </div>

          <div className="mt-3 pt-3 flex items-center justify-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setMode('landing')}
              className="flex items-center gap-1 text-[11px] cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowRight className="w-3 h-3" style={{ transform: 'rotate(180deg)' }} />
              View landing page
            </button>
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <Lock className="w-3 h-3" />
          scrypt hashing • HttpOnly cookie sessions
        </p>
      </div>
    </div>
  );
};
