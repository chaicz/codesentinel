// Firebase Configuration Service
// Replace with your Firebase project config from Firebase Console

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Default config - user should replace with their own
export const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  return !firebaseConfig.apiKey.startsWith('YOUR_');
};

// Auth error messages mapping
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site.',
  'auth/credential-already-in-use': 'This credential is already associated with another account.',
  'auth/unauthorized-continue-uri': 'Unauthorized domain.',
  'auth/invalid-oauth-clientid': 'Invalid OAuth client configuration.',
  'auth/invalid-verification-code': 'Invalid verification code.',
  'auth/missing-verification-code': 'Verification code is required.',
  'auth/invalid-verification-id': 'Invalid verification ID.',
  'auth/missing-verification-id': 'Verification ID is required.',
  'auth/app-not-authorized': 'App is not authorized to use Firebase Authentication.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
  'auth/related-domain-not-allowed': 'Domain not allowed.',
  'auth/unverified-email': 'Please verify your email address.',
  'auth/provider-already-linked': 'This provider is already linked to your account.',
  'auth/no-such-provider': 'This account is not linked to this provider.',
  'auth/rejected-credential': 'Request rejected.',
  'auth/expired-action-code': 'This link has expired.',
  'auth/invalid-action-code': 'This link is invalid.',
  'auth/invalid-phone-number': 'Please enter a valid phone number.',
  'auth/missing-phone-number': 'Phone number is required.',
  'auth/maximum-second-factor-count-exceeded': 'Maximum number of second factors exceeded.',
  'auth/unsupported-second-factor': 'This second factor is not supported.',
  'auth/second-factor-already-in-use': 'Second factor already in use.',
  'auth/missing-multi-factor-info': 'Missing multi-factor info.',
  'auth/missing-multi-factor-session': 'Missing multi-factor session.',
  'auth/invalid-multi-factor-session': 'Invalid multi-factor session.',
  'auth/multi-factor-info-not-found': 'Multi-factor info not found.',
  'auth/invalid-continue-uri': 'Invalid continue URL.',
  'auth/continue-url-required': 'Continue URL is required.',
  'auth/no-auth-event': 'No authentication event.',
  'auth/uid-already-exists': 'This UID is already in use.',
  'auth/web-storage-unsupported': 'Web storage is not supported or disabled.',
  'auth/web-storage-unsupported-captcha': 'Web storage is blocked by CAPTCHA.',
  'auth/tenant-id-mismatch': 'Tenant ID mismatch.',
  'auth/unsupported-tenant-operation': 'Unsupported tenant operation.',
  'auth/invalid-tenant-type': 'Invalid tenant type.',
  'auth/dynamic-link-not-activated': 'Dynamic links are not activated.',
  'auth/blocked-hashed-user-id': 'Account blocked.',
  'auth/user-not-found': 'User account not found.',
  // Custom errors
  'firebase-not-configured': 'Firebase is not configured. Please contact the administrator.',
  'network-error': 'Network error. Please check your internet connection.',
  'unknown-error': 'An unexpected error occurred. Please try again.',
};

export const getAuthErrorMessage = (errorCode: string): string => {
  return AUTH_ERROR_MESSAGES[errorCode] || AUTH_ERROR_MESSAGES['unknown-error'];
};
