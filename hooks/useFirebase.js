// ============================================
// hooks/useFirebase.js - FIXED VERSION
// ============================================
'use client';

import { useState, useEffect } from 'react';

export function useFirebase() {
  const [firebase, setFirebase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const initializeFirebase = async () => {
      try {
        console.log('🔥 Initializing Firebase...');
        
        // ✅ DYNAMIC IMPORT: Avoid SSR issues
        const { auth } = await import('../lib/firebase');
        
        // ✅ WAIT: Give Firebase time to initialize
        await new Promise(resolve => setTimeout(resolve, 200));

        // ✅ VERIFY: Check if auth is properly initialized
        if (!auth) {
          throw new Error('Firebase auth failed to initialize');
        }

        // Create Firebase instance object
        const firebaseInstance = {
          auth,
          isInitialized: true
        };

        console.log('✅ Firebase initialized successfully');
        setFirebase(firebaseInstance);
        setError(null);

      } catch (err) {
        console.error('❌ Firebase initialization failed:', err);
        setError(err.message);
        
        setFirebase(null);
      } finally {
        setLoading(false);
      }
    };

    initializeFirebase();
  }, []);

  return { 
    firebase, 
    loading, 
    error,
    isReady: !loading && firebase && !error
  };
}