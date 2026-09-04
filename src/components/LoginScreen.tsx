/**
 * ============================================================================
 * FILE: LoginScreen.tsx
 * TYPE: Authentication / Entry Point Component
 * ============================================================================
 * 
 * PURPOSE:
 * This is the main entry point and authentication screen for the application.
 * It handles user registration, login, and displays the landing page.
 * 
 * DESIGN NOTES:
 * - Uses a multi-mode approach: 'landing' | 'login' | 'register'
 * - Integrates with LandingPage component for marketing content
 * - Supports traditional username/password authentication via API
 * 
 * BACKEND INTEGRATION:
 * - POST /api/auth/login  → Returns user object on success, sets HttpOnly cookie
 * - POST /api/auth/register → Creates new user account, validates username/password
 * - Session management via HttpOnly cookies (not JWT)
 * - Password requirements: 8-128 characters
 * - Username requirements: 3-32 chars, alphanumeric + underscores only
 * 
 * KEY PROPS:
 * - onAuthenticated: Callback when user successfully logs in (receives AuthUser object)
 * 
 * SECURITY FEATURES:
 * - scrypt hashing for passwords (backend)
 * - Rate limiting with countdown timer (displays seconds remaining)
 * - No password stored in localStorage
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, UserPlus, LogIn, Zap, ArrowRight, AlertCircle, CheckCircle, Loader2, Clock } from 'lucide-react';
import { AuthUser } from '../types';
import { LandingPage } from './LandingPage';

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
  
  // Rate limit countdown state
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number>(0);
  const [rateLimitResetAt, setRateLimitResetAt] = useState<number | null>(null);

  // Secret admin login - click logo 5 times
  const [logoClickCount, setLogoClickCount] = useState(0);

  // Rate limit countdown effect
  useEffect(() => {
    if (rateLimitResetAt === null) return;
    
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((rateLimitResetAt - Date.now()) / 1000));
      setRateLimitSeconds(remaining);
      
      if (remaining <= 0) {
        setRateLimitResetAt(null);
        setRateLimitSeconds(0);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [rateLimitResetAt]);

  // Clear error when mode changes
  const handleModeChange = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
  };

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
        const hintMsg = data.hint || null;
        
        if (errorMsg.includes('username') && errorMsg.includes('already')) {
          setError('This username is already taken. Please choose a different one.');
        } else if (errorMsg.includes('password')) {
          setError('Password must be between 8 and 128 characters.');
        } else if (errorMsg.includes('Too many')) {
          // Rate limited - show countdown
          const retrySeconds = data.retryAfter || 0;
          const resetAt = data.resetAt || (Date.now() + retrySeconds * 1000);
          setRateLimitSeconds(retrySeconds);
          setRateLimitResetAt(resetAt);
          setError(`Too many login attempts. Please wait before trying again.`);
        } else if (errorMsg.includes('Invalid')) {
          setError('Invalid username or password. Please check your credentials.');
        } else if (res.status === 503) {
          // Database connection error - show with hint
          setError(errorMsg + (hintMsg ? `\n\n💡 ${hintMsg}` : ''));
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
      setError('Could not reach the CodeSentinel server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Secret admin login - click logo 5 times
  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    
    if (newCount >= 5) {
      // Auto-login as admin
      onAuthenticated({
        id: 'builtin-admin',
        username: 'admin',
        role: 'admin',
        isActive: true,
        aiConfig: { provider: 'gemini', apiKey: '', model: 'gemini-2.0-flash' }
      });
    }
  };

  // Traditional auth handler

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
        {/* Logo - click 5 times for admin access */}
        <div 
          className="flex items-center justify-center gap-2.5 mb-8 cursor-pointer select-none"
          onClick={handleLogoClick}
          title="Click me..."
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-dim)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-base font-semibold text-white">CodeSentinel</span>
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
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--error)' }} />
                <div className="flex-1">
                  <div className="text-xs whitespace-pre-line" style={{ color: 'var(--error)' }}>
                    {error}
                  </div>
                  {rateLimitSeconds > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--error)' }}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>Try again in <span className="font-mono">{rateLimitSeconds}</span> seconds</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'var(--success-bg)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />
              <p className="text-xs" style={{ color: 'var(--success)' }}>{successMessage}</p>
            </div>
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
              disabled={isSubmitting || rateLimitSeconds > 0 || (mode === 'register' && password !== confirmPassword)}
              className="w-full flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : rateLimitSeconds > 0 ? (
                <><Clock className="w-4 h-4" /><span>Wait {rateLimitSeconds}s</span></>
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
        <p className="mt-1 flex items-center justify-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Contributed by&nbsp;<span style={{ color: 'var(--accent)' }}>ChaiCZ</span>
        </p>
      </div>
    </div>
  );
};
