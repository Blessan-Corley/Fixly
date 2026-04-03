'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hasConsent = localStorage.getItem('fixly-cookie-consent');
    if (hasConsent) {
      return;
    }

    const timer = setTimeout(() => {
      setShowConsent(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('fixly-cookie-consent', 'accepted');
    setShowConsent(false);
  };

  const handleLearnMore = () => {
    router.push('/cookies');
  };

  if (!showConsent) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-4 right-4 z-50 max-w-sm"
      >
        <div className="relative rounded-xl border border-fixly-border bg-fixly-card p-6 shadow-fixly-xl">
          <div className="mb-4 flex items-start">
            <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-fixly-accent/10">
              <Cookie className="h-5 w-5 text-fixly-accent" />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 font-semibold text-fixly-text">We use cookies</h3>
              <p className="text-sm leading-relaxed text-fixly-text-light">
                Fixly uses cookies to enhance your experience, remember your preferences, and help
                us improve our service marketplace.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={handleAccept} className="btn-primary w-full px-4 py-2 text-sm">
              Got it!
            </button>
            <button
              onClick={handleLearnMore}
              className="text-sm font-medium text-fixly-accent transition-colors hover:text-fixly-accent-dark"
            >
              Learn how we use cookies
            </button>
          </div>

          <button
            onClick={handleAccept}
            className="absolute right-2 top-2 text-fixly-text-muted transition-colors hover:text-fixly-text"
            aria-label="Close cookie notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
