'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  toggleTheme: () => void;
  setLightTheme: () => void;
  setDarkTheme: () => void;
  setSystemTheme: () => void;
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
};

type ThemeProviderProps = {
  children: ReactNode;
};

const STORAGE_KEY = 'fixly-theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getSystemTheme = (): ResolvedTheme => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const initialTheme: ThemePreference =
      savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system';

    setTheme(initialTheme);
    setResolvedTheme(initialTheme === 'system' ? getSystemTheme() : initialTheme);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    setResolvedTheme(theme === 'system' ? getSystemTheme() : theme);
  }, [mounted, theme]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);

    if (theme === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#10141C' : '#FDFDFD');
    }
  }, [mounted, resolvedTheme, theme]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (theme === 'system') {
        setResolvedTheme(event.matches ? 'dark' : 'light');
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }

    mediaQuery.addListener(handleSystemThemeChange);
    return () => mediaQuery.removeListener(handleSystemThemeChange);
  }, [mounted, theme]);

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
      return;
    }

    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      toggleTheme,
      setLightTheme: () => setTheme('light'),
      setDarkTheme: () => setTheme('dark'),
      setSystemTheme: () => setTheme('system'),
      isDark: resolvedTheme === 'dark',
      isLight: resolvedTheme === 'light',
      isSystem: theme === 'system',
    }),
    [resolvedTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
