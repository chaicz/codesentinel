import React, { useState } from 'react';
import { Lock, ShieldCheck, UserPlus, LogIn, Zap, ArrowRight } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
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
        setError(data.error || 'Authentication failed.');
        return;
      }
      onAuthenticated(data.user);
    } catch {
      setError('Could not reach the Sentinel server.');
    } finally {
      setIsSubmitting(false);
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

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Username</label>
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
            </div>

            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Password</label>
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
                placeholder="Min 8 characters"
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Confirm password</label>
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
                  required
                />
              </div>
            )}

            {error && (
              <p className="text-xs px-3 py-2 rounded-md" style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error)' }}>
                {error}
              </p>
            )}

            <button
              id="auth-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <><LogIn className="w-4 h-4" /><span>Sign in</span></>
              ) : (
                <><UserPlus className="w-4 h-4" /><span>Create account</span></>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              {mode === 'login' ? 'No account?' : 'Already registered?'}
            </p>
            <button
              type="button"
              id="auth-toggle-mode"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
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
