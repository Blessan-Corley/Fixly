'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function ThemeToggle({ variant = 'button', className = '' }) {
  const { theme, resolvedTheme, toggleTheme, setLightTheme, setDarkTheme, setSystemTheme, isDark, isSystem } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-10 h-10 rounded-xl bg-fixly-card border border-fixly-border animate-pulse ${className}`} />
    );
  }

  // Simple toggle button
  if (variant === 'button') {
    return (
      <motion.button
        onClick={toggleTheme}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl bg-fixly-card hover:bg-fixly-card-hover border border-fixly-border hover:border-fixly-primary transition-all duration-200 group ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isSystem ? (
            <motion.div
              key="system"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Monitor className="h-5 w-5 text-fixly-text group-hover:text-fixly-primary transition-colors" />
            </motion.div>
          ) : isDark ? (
            <motion.div
              key="dark"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="h-5 w-5 text-fixly-text group-hover:text-fixly-primary transition-colors" />
            </motion.div>
          ) : (
            <motion.div
              key="light"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="h-5 w-5 text-fixly-text group-hover:text-fixly-primary transition-colors" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  // Dropdown variant with system theme option
  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-fixly-card hover:bg-fixly-card-hover border border-fixly-border hover:border-fixly-primary transition-all duration-200 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isSystem ? (
            <motion.div
              key="system"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Monitor className="h-5 w-5 text-fixly-text group-hover:text-fixly-primary transition-colors" />
            </motion.div>
          ) : isDark ? (
            <motion.div
              key="dark"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="h-5 w-5 text-fixly-text group-hover:text-fixly-primary transition-colors" />
            </motion.div>
          ) : (
            <motion.div
              key="light"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="h-5 w-5 text-fixly-text group-hover:text-fixly-primary transition-colors" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-12 right-0 z-50 w-48 bg-fixly-card border border-fixly-border rounded-xl shadow-fixly-lg py-2"
            >
              {/* Light Mode */}
              <button
                onClick={() => {
                  setLightTheme();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-fixly-text hover:bg-fixly-bg-secondary transition-colors"
              >
                <Sun className="h-4 w-4 mr-3" />
                Light Mode
                {theme === 'light' && <Check className="h-4 w-4 ml-auto text-fixly-primary" />}
              </button>

              {/* Dark Mode */}
              <button
                onClick={() => {
                  setDarkTheme();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-fixly-text hover:bg-fixly-bg-secondary transition-colors"
              >
                <Moon className="h-4 w-4 mr-3" />
                Dark Mode
                {theme === 'dark' && <Check className="h-4 w-4 ml-auto text-fixly-primary" />}
              </button>

              {/* System Theme */}
              <button
                onClick={() => {
                  setSystemTheme();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-fixly-text hover:bg-fixly-bg-secondary transition-colors"
              >
                <Monitor className="h-4 w-4 mr-3" />
                System
                {theme === 'system' && <Check className="h-4 w-4 ml-auto text-fixly-primary" />}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}