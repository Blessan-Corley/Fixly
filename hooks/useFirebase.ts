'use client';

import type { Auth } from 'firebase/auth';
import { useEffect, useState } from 'react';

type FirebaseInstance = {
  auth: Auth;
  isInitialized: true;
};

type UseFirebaseResult = {
  firebase: FirebaseInstance | null;
  loading: boolean;
  error: string | null;
  isReady: boolean;
};

type FirebaseClientModule = {
  auth?: Auth;
};

export function useFirebase(): UseFirebaseResult {
  const [firebase, setFirebase] = useState<FirebaseInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const initializeFirebase = async () => {
      try {
        const firebaseModule = (await import('@/lib/firebase-client')) as FirebaseClientModule;
        const auth = firebaseModule.auth;
        await new Promise((resolve) => setTimeout(resolve, 200));

        if (!auth) {
          throw new Error('Firebase auth failed to initialize');
        }

        if (!cancelled) {
          setFirebase({
            auth,
            isInitialized: true,
          });
          setError(null);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Firebase initialization failed';
        if (!cancelled) {
          setError(message);
          setFirebase(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeFirebase();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    firebase,
    loading,
    error,
    isReady: !loading && !!firebase && !error,
  };
}
