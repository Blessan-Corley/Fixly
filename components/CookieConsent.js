'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLoading } from '../contexts/LoadingContext';

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);
  const router = useRouter();
  const { isAnyLoading } = useLoading();

  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = localStorage.getItem('fixly-cookie-consent');
    if (!hasConsent) {
      // Wait for all loading to finish, then show popup after additional delay
      const checkAndShow = () => {
        if (!isAnyLoading()) {
          // Show consent popup after page loads properly (3 seconds after loading stops)
          const timer = setTimeout(() => {
            setShowConsent(true);
          }, 3000);
          return timer;
        }
        return null;
      };

      // Check immediately
      const initialTimer = checkAndShow();
      
      // Also check periodically until loading stops
      const intervalId = setInterval(() => {
        if (!isAnyLoading()) {
          clearInterval(intervalId);
          if (!showConsent) {
            const timer = setTimeout(() => {
              setShowConsent(true);
            }, 3000);
            return () => clearTimeout(timer);
          }
        }
      }, 500);

      return () => {
        if (initialTimer) clearTimeout(initialTimer);
        clearInterval(intervalId);
      };
    }
  }, [isAnyLoading, showConsent]);

  const handleAccept = () => {
    localStorage.setItem('fixly-cookie-consent', 'accepted');
    setShowConsent(false);
  };

  const handleLearnMore = () => {
    router.push('/cookies');
  };

  if (!showConsent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        className="fixed bottom-4 right-4 z-50 max-w-sm"
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
                Fixly uses cookies to enhance your experience, remember your preferences, and help us improve our service marketplace.
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