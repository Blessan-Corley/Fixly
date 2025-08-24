import { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

// Dark mode consistency enhancer
export default function DarkModeEnhancer({ children }) {
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
    } else {
      root.style.setProperty('--scrollbar-bg', 'rgb(241 245 249)'); // Light scrollbar
      root.style.setProperty('--scrollbar-thumb', 'rgb(203 213 225)');
      root.style.setProperty('--scrollbar-thumb-hover', 'rgb(148 163 184)');
      root.style.setProperty('--selection-bg', 'rgba(13, 148, 136, 0.2)');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
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

  return children;
}

// Enhanced CSS styles for dark mode consistency
export const DarkModeStyles = () => (
  <style jsx global>{`
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

    /* Smooth theme transitions */
    * {
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }

    /* Enhanced shadow consistency */
    .shadow-fixly-sm { box-shadow: 0 1px 2px 0 var(--shadow-color); }
    .shadow-fixly-md { box-shadow: 0 4px 6px -1px var(--shadow-color); }
    .shadow-fixly-lg { box-shadow: 0 10px 15px -3px var(--shadow-color); }
    .shadow-fixly-xl { box-shadow: 0 20px 25px -5px var(--shadow-color); }

    /* Better input styling in dark mode */
    .dark-mode input:not([type="radio"]):not([type="checkbox"]):not([type="range"]),
    .dark-mode textarea,
    .dark-mode select {
      background-color: rgb(39 48 63);
      border-color: rgb(55 65 81);
      color: rgb(241 245 249);
    }

    .dark-mode input:not([type="radio"]):not([type="checkbox"]):not([type="range"]):focus,
    .dark-mode textarea:focus,
    .dark-mode select:focus {
      border-color: rgb(20, 184, 166);
      box-shadow: 0 0 0 1px rgb(20, 184, 166);
    }

    /* Better button styling in dark mode */
    .dark-mode .btn-primary {
      background-color: rgb(20, 184, 166);
      color: rgb(16, 20, 28);
    }

    .dark-mode .btn-primary:hover {
      background-color: rgb(15, 166, 151);
    }

    .dark-mode .btn-secondary {
      background-color: rgb(51, 65, 85);
      color: rgb(203, 213, 225);
      border-color: rgb(75, 85, 99);
    }

    .dark-mode .btn-secondary:hover {
      background-color: rgb(75, 85, 99);
    }

    /* Enhanced card styling */
    .dark-mode .card {
      background-color: rgb(30, 35, 47);
      border-color: rgb(55, 65, 81);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }

    /* Better modal/dropdown styling in dark mode */
    .dark-mode .modal,
    .dark-mode .dropdown {
      background-color: rgb(30, 35, 47);
      border-color: rgb(55, 65, 81);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
    }

    /* Enhanced notification styling */
    .dark-mode .notification {
      background-color: rgb(39, 48, 63);
      border-color: rgb(75, 85, 99);
    }

    .dark-mode .notification.unread {
      background-color: rgba(20, 184, 166, 0.1);
      border-left: 3px solid rgb(20, 184, 166);
    }

    /* Better toast styling */
    .dark-mode .toast {
      background-color: rgb(30, 35, 47) !important;
      color: rgb(241, 245, 249) !important;
      border: 1px solid rgb(55, 65, 81) !important;
    }

    /* Loading spinner color */
    .dark-mode .loader {
      border-color: rgb(75, 85, 99);
      border-top-color: rgb(20, 184, 166);
    }

    /* Enhanced mobile styles */
    @media (max-width: 768px) {
      .dark-mode {
        /* Darker mobile background for OLED screens */
        --background: 0 0 0; /* Pure black for mobile */
      }
      
      .dark-mode .mobile-card {
        background-color: rgb(20, 25, 37);
        border-color: rgb(45, 55, 72);
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .dark-mode {
        --foreground: 255 255 255;
        --background: 0 0 0;
        --border: 128 128 128;
      }
      
      .light-mode {
        --foreground: 0 0 0;
        --background: 255 255 255;
        --border: 128 128 128;
      }
    }

    /* Reduce motion for accessibility */
    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
        animation: none !important;
      }
    }
  `}</style>
);

// Utility hook for theme-aware styling
export function useThemeAwareStyle() {
  const { isDark, resolvedTheme } = useTheme();

  const getThemeStyle = (lightStyle, darkStyle) => {
    return isDark ? darkStyle : lightStyle;
  };

  const getThemeClass = (lightClass, darkClass) => {
    return isDark ? darkClass : lightClass;
  };

  const getThemeColor = (lightColor, darkColor) => {
    return isDark ? darkColor : lightColor;
  };

  return {
    isDark,
    resolvedTheme,
    getThemeStyle,
    getThemeClass,
    getThemeColor
  };
}