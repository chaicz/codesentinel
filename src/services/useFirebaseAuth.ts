// Firebase Authentication Hook
import { useState, useCallback, useEffect } from 'react';
import { AuthUser } from '../types';
import { firebaseConfig, isFirebaseConfigured, getAuthErrorMessage } from './firebase';

// Firebase types (loaded dynamically)
declare global {
  interface Window {
    firebase?: {
      initializeApp: (config: any) => any;
      auth: () => any;
    };
  }
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface UseFirebaseAuthReturn {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

// Load Firebase SDK dynamically
let firebaseInitialized = false;
let firebaseApp: any = null;

const loadFirebase = async (): Promise<boolean> => {
  if (firebaseInitialized) return true;
  
  if (!isFirebaseConfigured()) {
    console.warn('Firebase is not configured. Please add your Firebase config.');
    return false;
  }

  return new Promise((resolve) => {
    // Check if already loaded
    if (window.firebase?.auth) {
      firebaseInitialized = true;
      resolve(true);
      return;
    }

    // Load Firebase SDK
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
    script.async = true;
    
    script.onload = () => {
      const firebaseScript = document.createElement('script');
      firebaseScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
      firebaseScript.async = true;
      
      firebaseScript.onload = () => {
        try {
          firebaseApp = window.firebase?.initializeApp(firebaseConfig);
          firebaseInitialized = true;
          resolve(true);
        } catch (err) {
          console.error('Failed to initialize Firebase:', err);
          resolve(false);
        }
      };
      
      firebaseScript.onerror = () => {
        console.error('Failed to load Firebase Auth SDK');
        resolve(false);
      };
      
      document.head.appendChild(firebaseScript);
    };
    
    script.onerror = () => {
      console.error('Failed to load Firebase SDK');
      resolve(false);
    };
    
    document.head.appendChild(script);
  });
};

export function useFirebaseAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize Firebase and check current user
  useEffect(() => {
    const init = async () => {
      const loaded = await loadFirebase();
      if (!loaded) {
        setInitialized(true);
        return;
      }

      const auth = window.firebase?.auth();
      if (auth) {
        // Check for existing user
        auth.onAuthStateChanged((firebaseUser: FirebaseUser | null) => {
          setUser(firebaseUser);
          setInitialized(true);
        }, (authError: any) => {
          console.error('Auth state change error:', authError);
          setError(getAuthErrorMessage(authError.code || 'unknown-error'));
          setInitialized(true);
        });
      } else {
        setInitialized(true);
      }
    };

    init();
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async (): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);

    try {
      const loaded = await loadFirebase();
      if (!loaded) {
        setError('Firebase is not configured. Please contact the administrator.');
        setLoading(false);
        return null;
      }

      const auth = window.firebase?.auth();
      if (!auth) {
        setError('Firebase Authentication is not available.');
        setLoading(false);
        return null;
      }

      const googleProvider = new window.firebase.auth.GoogleAuthProvider();
      googleProvider.addScope('email');
      googleProvider.addScope('profile');

      const result = await auth.signInWithPopup(googleProvider);
      const firebaseUser: FirebaseUser = {
        uid: result.user?.uid || '',
        email: result.user?.email || null,
        displayName: result.user?.displayName || null,
        photoURL: result.user?.photoURL || null,
      };
      
      setUser(firebaseUser);
      setLoading(false);
      return firebaseUser;
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const errorMessage = getAuthErrorMessage(err.code || 'unknown-error');
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const auth = window.firebase?.auth();
      if (auth) {
        await auth.signOut();
        setUser(null);
      }
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(getAuthErrorMessage(err.code || 'unknown-error'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading: loading || !initialized,
    error,
    signInWithGoogle,
    signOut,
    clearError,
  };
}

// Convert Firebase user to AuthUser for the app
export function firebaseUserToAuthUser(firebaseUser: FirebaseUser): AuthUser {
  return {
    id: firebaseUser.uid,
    username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'user',
    email: firebaseUser.email || undefined,
    avatar: firebaseUser.photoURL || undefined,
    isFirebaseUser: true,
  };
}
