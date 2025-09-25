'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

// Consolidated Dark Mode Manager
// Combines DarkModeEnhancer and DarkModeFixups functionality
export default function DarkModeManager({ children }) {
  const [mounted, setMounted] = useState(false);

  // Only run on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted on client
  if (!mounted) {
    return children;
  }

  return <DarkModeManagerClient>{children}</DarkModeManagerClient>;
}

function DarkModeManagerClient({ children }) {
  const { isDark, resolvedTheme } = useTheme();

  useEffect(() => {
    // Ensure proper CSS custom properties are set
    const root = document.documentElement;

    // Enhanced dark mode utilities
    if (isDark) {
      root.style.setProperty('--scrollbar-bg', 'rgb(30 35 47)'); // Dark scrollbar
      root.style.setProperty('--scrollbar-thumb', 'rgb(55 65 81)');
      root.style.setProperty('--scrollbar-thumb-hover', 'rgb(75 85 99)');
      root.style.setProperty('--selection-bg', 'rgba(20, 184, 166, 0.3)');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.5)');

      // Enhanced variables for better dark mode
      root.style.setProperty('--fixly-text-enhanced', 'rgb(241, 245, 249)');
      root.style.setProperty('--fixly-text-muted-enhanced', 'rgb(148, 163, 184)');
      root.style.setProperty('--fixly-border-enhanced', 'rgb(55, 65, 81)');
      root.style.setProperty('--fixly-bg-enhanced', 'rgb(17, 24, 39)');
      root.style.setProperty('--fixly-card-enhanced', 'rgb(31, 41, 55)');
    } else {
      root.style.setProperty('--scrollbar-bg', 'rgb(241 245 249)'); // Light scrollbar
      root.style.setProperty('--scrollbar-thumb', 'rgb(203 213 225)');
      root.style.setProperty('--scrollbar-thumb-hover', 'rgb(148 163 184)');
      root.style.setProperty('--selection-bg', 'rgba(13, 148, 136, 0.2)');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');

      // Light mode enhanced variables
      root.style.setProperty('--fixly-text-enhanced', 'rgb(28, 31, 38)');
      root.style.setProperty('--fixly-text-muted-enhanced', 'rgb(113, 128, 150)');
      root.style.setProperty('--fixly-border-enhanced', 'rgb(226, 232, 240)');
      root.style.setProperty('--fixly-bg-enhanced', 'rgb(253, 253, 253)');
      root.style.setProperty('--fixly-card-enhanced', 'rgb(255, 255, 255)');
    }

    // Add theme class to body for global styling
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(isDark ? 'dark-mode' : 'light-mode');

    // Set meta theme-color for mobile browsers
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }

    metaThemeColor.content = isDark ? '#10141C' : '#FDFDFD';

    // Handle system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Emit custom event for components that need to know about system theme changes
      window.dispatchEvent(new CustomEvent('themeChange', {
        detail: {
          theme: resolvedTheme,
          isDark: isDark,
          isSystem: resolvedTheme === 'system'
        }
      }));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isDark, resolvedTheme]);

  useEffect(() => {
    // Add dynamic dark mode fixes to the document
    const styleId = 'dark-mode-manager-styles';
    let existingStyle = document.getElementById(styleId);

    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Enhanced scrollbar styling for both themes */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: var(--scrollbar-bg);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb);
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-thumb-hover);
      }

      /* Better text selection */
      ::selection {
        background: var(--selection-bg);
      }

      ::-moz-selection {
        background: var(--selection-bg);
      }

      /* Enhanced focus styles */
      .dark-mode *:focus {
        outline: 2px solid rgb(20, 184, 166);
        outline-offset: 2px;
      }

      .light-mode *:focus {
        outline: 2px solid rgb(13, 148, 136);
        outline-offset: 2px;
      }

      /* Form inputs in dark mode */
      .dark input,
      .dark textarea,
      .dark select {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }

      .dark input::placeholder,
      .dark textarea::placeholder {
        color: rgb(148, 163, 184) !important;
      }

      .dark input:focus,
      .dark textarea:focus,
      .dark select:focus {
        border-color: rgb(20, 184, 166) !important;
        box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1) !important;
      }

      /* Button enhancements in dark mode */
      .dark .btn-secondary {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }

      .dark .btn-secondary:hover {
        background-color: rgb(55, 65, 81) !important;
        border-color: rgb(20, 184, 166) !important;
      }

      /* Card enhancements in dark mode */
      .dark .card {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      /* Enhanced shadow effects */
      .dark .shadow-fixly {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3) !important;
      }

      .dark .shadow-fixly-lg {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3) !important;
      }

      /* Modal and overlay improvements */
      .dark .modal-overlay {
        background-color: rgba(0, 0, 0, 0.8) !important;
      }

      .dark .modal {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      /* Navigation improvements */
      .dark .navbar {
        background-color: rgba(17, 24, 39, 0.95) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      .dark .sidebar {
        background-color: rgb(17, 24, 39) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      /* Dropdown and select improvements */
      .dark select option {
        background-color: rgb(31, 41, 55) !important;
        color: rgb(241, 245, 249) !important;
      }

      /* Table improvements */
      .dark table {
        background-color: rgb(31, 41, 55) !important;
      }

      .dark th, .dark td {
        border-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }

      .dark tr:hover {
        background-color: rgb(55, 65, 81) !important;
      }

      /* Loading state improvements */
      .dark .skeleton {
        background-color: rgb(55, 65, 81) !important;
      }

      /* Toast notification improvements */
      .dark .toast {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }

      /* Badge and chip improvements */
      .dark .badge {
        background-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }

      .dark .skill-chip {
        background-color: rgb(55, 65, 81) !important;
        border-color: rgb(75, 85, 99) !important;
        color: rgb(203, 213, 225) !important;
      }

      .dark .skill-chip:hover {
        border-color: rgb(20, 184, 166) !important;
        color: rgb(20, 184, 166) !important;
      }

      /* Progress bar improvements */
      .dark .progress-bar {
        background-color: rgb(55, 65, 81) !important;
      }

      /* Tab improvements */
      .dark .tab {
        border-color: rgb(55, 65, 81) !important;
        color: rgb(203, 213, 225) !important;
      }

      .dark .tab.active {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(20, 184, 166) !important;
        color: rgb(20, 184, 166) !important;
      }

      /* Divider improvements */
      .dark hr, .dark .divider {
        border-color: rgb(55, 65, 81) !important;
      }

      /* Image and media improvements */
      .dark img {
        opacity: 0.9;
      }

      .dark img:hover {
        opacity: 1;
      }

      /* Print styles for dark mode */
      @media print {
        .dark-mode * {
          background: white !important;
          color: black !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .dark-mode {
          --fixly-primary: rgb(56, 223, 204);
          --fixly-text: rgb(255, 255, 255);
          --fixly-bg: rgb(0, 0, 0);
          --fixly-card: rgb(17, 24, 39);
        }
      }

      /* Reduce motion for accessibility */
      @media (prefers-reduced-motion: reduce) {
        .dark-mode *,
        .light-mode * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;

    document.head.appendChild(style);

    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [isDark]);

  return children;
}

// Export for backwards compatibility
export const DarkModeEnhancer = DarkModeManager;
export const DarkModeStyles = () => null; // Not needed anymore as styles are injected