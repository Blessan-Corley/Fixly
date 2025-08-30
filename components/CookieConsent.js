'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Memoized animation variants for better performance
const animationVariants = {
  initial: { opacity: 0, y: 100, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 100, scale: 0.9 }
};

const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30
};

// Custom hook for consent management with optimization
const useConsentManagement = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    // Early return if already checked to avoid duplicate localStorage access
    if (isChecked) return;

    // Use requestIdleCallback for non-critical consent checking
    const checkConsent = () => {
      const hasConsent = localStorage.getItem('fixly-cookie-consent');
      setIsChecked(true);
      
      if (!hasConsent) {
        // Use setTimeout for deferred execution to avoid blocking initial render
        const timer = setTimeout(() => {
          setShowConsent(true);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    };

    // Use requestIdleCallback if available, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      const idleCallback = requestIdleCallback(checkConsent, { timeout: 3000 });
      return () => cancelIdleCallback(idleCallback);
    } else {
      return checkConsent();
    }
  }, [isChecked]);

  return { showConsent, setShowConsent };
};

export default function CookieConsent() {
  const { showConsent, setShowConsent } = useConsentManagement();
  const router = useRouter();

  // Memoized event handlers for better performance
  const handleAccept = useCallback(() => {
    try {
      localStorage.setItem('fixly-cookie-consent', 'accepted');
      setShowConsent(false);
    } catch (error) {
      // Gracefully handle localStorage errors (e.g., in private browsing)
      console.warn('Failed to save consent preference:', error);
      setShowConsent(false);
    }
  }, [setShowConsent]);

  const handleLearnMore = useCallback(() => {
    router.push('/cookies');
  }, [router]);

  // Early return to avoid unnecessary render work
  if (!showConsent) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        variants={animationVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={springTransition}
        className="fixed bottom-4 right-4 z-50 max-w-sm"
        // Performance optimization: reduce layout thrashing
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="bg-fixly-card border border-fixly-border rounded-xl shadow-fixly-xl p-6 relative">
          <div className="flex items-start mb-4">
            <div className="bg-fixly-accent/10 w-10 h-10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
              <Cookie className="h-5 w-5 text-fixly-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-fixly-text mb-2">
                We use cookies
              </h3>
              <p className="text-sm text-fixly-text-light leading-relaxed">
                Fixly uses cookies and local storage to enhance your experience, remember your preferences, store your location settings, and help us improve our job marketplace.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={handleAccept}
              className="btn-primary w-full text-sm py-2 px-4"
            >
              Got it!
            </button>
            <button
              onClick={handleLearnMore}
              className="text-fixly-accent hover:text-fixly-accent-dark text-sm font-medium transition-colors"
            >
              Learn how we use cookies
            </button>
          </div>
          
          {/* Optional close button */}
          <button
            onClick={handleAccept}
            className="absolute top-2 right-2 text-fixly-text-muted hover:text-fixly-text transition-colors"
            aria-label="Close cookie notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}