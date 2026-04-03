'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { useTheme } from '../../contexts/ThemeContext';

interface DarkModeManagerProps {
  children: ReactNode;
}

export default function DarkModeManager({ children }: DarkModeManagerProps) {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <DarkModeManagerClient>{children}</DarkModeManagerClient>;
}

function DarkModeManagerClient({ children }: DarkModeManagerProps) {
  const { theme, isDark, resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;

    if (isDark) {
      root.style.setProperty('--scrollbar-bg', 'rgb(30 35 47)');
      root.style.setProperty('--scrollbar-thumb', 'rgb(55 65 81)');
      root.style.setProperty('--scrollbar-thumb-hover', 'rgb(75 85 99)');
      root.style.setProperty('--selection-bg', 'rgba(20, 184, 166, 0.3)');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.5)');
      root.style.setProperty('--fixly-text-enhanced', 'rgb(241, 245, 249)');
      root.style.setProperty('--fixly-text-muted-enhanced', 'rgb(148, 163, 184)');
      root.style.setProperty('--fixly-border-enhanced', 'rgb(55, 65, 81)');
      root.style.setProperty('--fixly-bg-enhanced', 'rgb(17, 24, 39)');
      root.style.setProperty('--fixly-card-enhanced', 'rgb(31, 41, 55)');
    } else {
      root.style.setProperty('--scrollbar-bg', 'rgb(241 245 249)');
      root.style.setProperty('--scrollbar-thumb', 'rgb(203 213 225)');
      root.style.setProperty('--scrollbar-thumb-hover', 'rgb(148 163 184)');
      root.style.setProperty('--selection-bg', 'rgba(13, 148, 136, 0.2)');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--fixly-text-enhanced', 'rgb(28, 31, 38)');
      root.style.setProperty('--fixly-text-muted-enhanced', 'rgb(113, 128, 150)');
      root.style.setProperty('--fixly-border-enhanced', 'rgb(226, 232, 240)');
      root.style.setProperty('--fixly-bg-enhanced', 'rgb(253, 253, 253)');
      root.style.setProperty('--fixly-card-enhanced', 'rgb(255, 255, 255)');
    }

    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(isDark ? 'dark-mode' : 'light-mode');

    let metaThemeColor = document.querySelector(
      'meta[name="theme-color"]'
    ) as HTMLMetaElement | null;
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = isDark ? '#10141C' : '#FDFDFD';

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (): void => {
      window.dispatchEvent(
        new CustomEvent('themeChange', {
          detail: {
            theme: resolvedTheme,
            isDark,
            isSystem: theme === 'system',
          },
        })
      );
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isDark, resolvedTheme, theme]);

  useEffect(() => {
    const styleId = 'dark-mode-manager-styles';
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: var(--scrollbar-bg); border-radius: 4px; }
      ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; transition: background-color 0.2s ease; }
      ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }
      ::selection { background: var(--selection-bg); }
      ::-moz-selection { background: var(--selection-bg); }

      .dark-mode *:focus { outline: 2px solid rgb(20, 184, 166); outline-offset: 2px; }
      .light-mode *:focus { outline: 2px solid rgb(13, 148, 136); outline-offset: 2px; }

      .dark input, .dark textarea, .dark select {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }
      .dark input::placeholder, .dark textarea::placeholder { color: rgb(148, 163, 184) !important; }
      .dark input:focus, .dark textarea:focus, .dark select:focus {
        border-color: rgb(20, 184, 166) !important;
        box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1) !important;
      }
      .dark .btn-secondary {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }
      .dark .btn-secondary:hover { background-color: rgb(55, 65, 81) !important; border-color: rgb(20, 184, 166) !important; }
      .dark .card { background-color: rgb(31, 41, 55) !important; border-color: rgb(55, 65, 81) !important; }
      .dark .shadow-fixly { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3) !important; }
      .dark .shadow-fixly-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3) !important; }
      .dark .modal-overlay { background-color: rgba(0, 0, 0, 0.8) !important; }
      .dark .modal { background-color: rgb(31, 41, 55) !important; border-color: rgb(55, 65, 81) !important; }
      .dark .navbar { background-color: rgba(17, 24, 39, 0.95) !important; border-color: rgb(55, 65, 81) !important; }
      .dark .sidebar { background-color: rgb(17, 24, 39) !important; border-color: rgb(55, 65, 81) !important; }
      .dark select option { background-color: rgb(31, 41, 55) !important; color: rgb(241, 245, 249) !important; }
      .dark table { background-color: rgb(31, 41, 55) !important; }
      .dark th, .dark td { border-color: rgb(55, 65, 81) !important; color: rgb(241, 245, 249) !important; }
      .dark tr:hover { background-color: rgb(55, 65, 81) !important; }
      .dark .skeleton { background-color: rgb(55, 65, 81) !important; }
      .dark .toast { background-color: rgb(31, 41, 55) !important; border-color: rgb(55, 65, 81) !important; color: rgb(241, 245, 249) !important; }
      .dark .badge { background-color: rgb(55, 65, 81) !important; color: rgb(241, 245, 249) !important; }
      .dark .skill-chip { background-color: rgb(55, 65, 81) !important; border-color: rgb(75, 85, 99) !important; color: rgb(203, 213, 225) !important; }
      .dark .skill-chip:hover { border-color: rgb(20, 184, 166) !important; color: rgb(20, 184, 166) !important; }
      .dark .progress-bar { background-color: rgb(55, 65, 81) !important; }
      .dark .tab { border-color: rgb(55, 65, 81) !important; color: rgb(203, 213, 225) !important; }
      .dark .tab.active { background-color: rgb(31, 41, 55) !important; border-color: rgb(20, 184, 166) !important; color: rgb(20, 184, 166) !important; }
      .dark hr, .dark .divider { border-color: rgb(55, 65, 81) !important; }
      .dark img { opacity: 0.9; }
      .dark img:hover { opacity: 1; }

      @media print {
        .dark-mode * {
          background: white !important;
          color: black !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }
      }
      @media (prefers-contrast: high) {
        .dark-mode {
          --fixly-primary: rgb(56, 223, 204);
          --fixly-text: rgb(255, 255, 255);
          --fixly-bg: rgb(0, 0, 0);
          --fixly-card: rgb(17, 24, 39);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .dark-mode *, .light-mode * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;

    document.head.appendChild(style);

    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) styleToRemove.remove();
    };
  }, [isDark]);

  return <>{children}</>;
}

export const DarkModeEnhancer = DarkModeManager;
export const DarkModeStyles = () => null;
