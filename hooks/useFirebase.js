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
        
        // ✅ CRITICAL: Check environment variables
        const requiredEnvVars = [
          'NEXT_PUBLIC_FIREBASE_API_KEY',
          'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
          'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
          throw new Error(`Missing Firebase env vars: ${missingVars.join(', ')}`);
        }

        console.log('✅ Firebase env vars loaded:', {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10) + '...',
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        });

        // ✅ DYNAMIC IMPORT: Avoid SSR issues
        const { auth, PhoneAuth, RateLimiter } = await import('../lib/firebase');
        
        // ✅ WAIT: Give Firebase time to initialize
        await new Promise(resolve => setTimeout(resolve, 200));

        // ✅ VERIFY: Check if auth is properly initialized
        if (!auth) {
          throw new Error('Firebase auth failed to initialize');
        }

        // Create Firebase instance object
        const firebaseInstance = {
          auth,
          PhoneAuth,
          RateLimiter,
          isInitialized: true
        };

        console.log('✅ Firebase initialized successfully');
        setFirebase(firebaseInstance);
        setError(null);

      } catch (err) {
        console.error('❌ Firebase initialization failed:', err);
        setError(err.message);
        
        // ✅ PROVIDE FALLBACK: Mock implementation for graceful degradation
        const fallbackFirebase = {
          PhoneAuth: class MockPhoneAuth {
            constructor() {
              console.warn('📱 Using fallback PhoneAuth - Firebase failed to initialize');
            }
            
            async sendOTP() { 
              return { 
                success: false, 
                error: `Phone verification unavailable: ${err.message}` 
              }; 
            }
            
            async verifyOTP() { 
              return { 
                success: false, 
                error: `Phone verification unavailable: ${err.message}` 
              }; 
            }
            
            cleanup() {}
          },
          
          RateLimiter: class MockRateLimiter {
            static canSendOTP() { 
              return { 
                allowed: false, 
                message: `Phone verification unavailable: ${err.message}` 
              }; 
            }
            static recordOTPAttempt() {}
          },
          
          isInitialized: false,
          error: err.message
        };
        
        setFirebase(fallbackFirebase);
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