'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('system'); // Default to system
  const [resolvedTheme, setResolvedTheme] = useState('light'); // Actual theme being applied
  const [mounted, setMounted] = useState(false);

  // Set mounted to true after component mounts to avoid hydration issues
  useEffect(() => {
    setMounted(true);
    
    // Get theme from localStorage or default to system
    const savedTheme = localStorage.getItem('fixly-theme');
    const initialTheme = savedTheme || 'system';
    setTheme(initialTheme);
    
    // Resolve the actual theme to apply
    if (initialTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setResolvedTheme(systemTheme);
    } else {
      setResolvedTheme(initialTheme);
    }
  }, []);

  // Update resolved theme when theme preference changes
  useEffect(() => {
    if (!mounted) return;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setResolvedTheme(systemTheme);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme, mounted]);

  // Update document class and localStorage when resolved theme changes
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    // Remove previous theme classes
    root.classList.remove('light', 'dark');
    
    // Add resolved theme class
    root.classList.add(resolvedTheme);
    
    // Save theme preference (not resolved theme) to localStorage
    if (theme !== 'system') {
      localStorage.setItem('fixly-theme', theme);
    } else {
      localStorage.removeItem('fixly-theme'); // Remove to keep system as default
    }
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#10141C' : '#FDFDFD');
    }
  }, [resolvedTheme, theme, mounted]);

  // Listen to system theme changes
  useEffect(() => {
    if (!mounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      // Only update resolved theme if currently using system preference
      if (theme === 'system') {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addListener(handleSystemThemeChange);
    
    return () => mediaQuery.removeListener(handleSystemThemeChange);
  }, [theme, mounted]);

  const toggleTheme = () => {
    if (theme === 'system') {
      // If system, toggle to opposite of current resolved theme
      setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
    } else {
      // Toggle between light and dark
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  };

  const setLightTheme = () => setTheme('light');
  const setDarkTheme = () => setTheme('dark');
  const setSystemTheme = () => setTheme('system');

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="opacity-0">{children}</div>;
  }

  const value = {
    theme,
    resolvedTheme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}