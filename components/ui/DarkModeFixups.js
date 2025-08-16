'use client';

// Dark Mode Enhancement and Fix Component
// This component provides additional dark mode styles and fixes for better visibility

import { useEffect } from 'react';

export function DarkModeEnhancer() {
  useEffect(() => {
    // Add dynamic dark mode fixes to the document
    const darkModeStyles = `
      /* Enhanced dark mode visibility fixes */
      .dark {
        /* Better text contrast */
        --fixly-text-enhanced: rgb(241, 245, 249);
        --fixly-text-muted-enhanced: rgb(148, 163, 184);
        --fixly-border-enhanced: rgb(55, 65, 81);
        --fixly-bg-enhanced: rgb(17, 24, 39);
        --fixly-card-enhanced: rgb(31, 41, 55);
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

      /* Card components in dark mode */
      .dark .card,
      .dark .bg-fixly-card {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      /* Modal and dropdown improvements */
      .dark .modal-content,
      .dark .dropdown-content {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }

      /* Text color fixes */
      .dark .text-fixly-text-muted {
        color: rgb(148, 163, 184) !important;
      }

      .dark .text-gray-600 {
        color: rgb(156, 163, 175) !important;
      }

      .dark .text-gray-500 {
        color: rgb(107, 114, 128) !important;
      }

      /* Navigation fixes */
      .dark .nav-link {
        color: rgb(203, 213, 225) !important;
      }

      .dark .nav-link:hover {
        color: rgb(20, 184, 166) !important;
      }

      /* Sidebar enhancements */
      .dark .sidebar {
        background-color: rgb(17, 24, 39) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      .dark .sidebar-item {
        color: rgb(203, 213, 225) !important;
      }

      .dark .sidebar-item:hover {
        background-color: rgb(31, 41, 55) !important;
        color: rgb(20, 184, 166) !important;
      }

      .dark .sidebar-item.active {
        background-color: rgba(20, 184, 166, 0.1) !important;
        color: rgb(20, 184, 166) !important;
      }

      /* Table improvements */
      .dark table {
        background-color: rgb(31, 41, 55) !important;
      }

      .dark th {
        background-color: rgb(17, 24, 39) !important;
        color: rgb(241, 245, 249) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      .dark td {
        color: rgb(203, 213, 225) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      .dark tbody tr:hover {
        background-color: rgb(55, 65, 81) !important;
      }

      /* Badge improvements */
      .dark .badge {
        border-width: 1px !important;
      }

      .dark .badge-neutral {
        background-color: rgb(55, 65, 81) !important;
        color: rgb(203, 213, 225) !important;
        border-color: rgb(75, 85, 99) !important;
      }

      /* Loading states in dark mode */
      .dark .skeleton {
        background-color: rgb(55, 65, 81) !important;
      }

      .dark .animate-pulse {
        background-color: rgb(55, 65, 81) !important;
      }

      /* Notification improvements */
      .dark .notification {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }

      .dark .notification.unread {
        background-color: rgba(20, 184, 166, 0.05) !important;
        border-left-color: rgb(20, 184, 166) !important;
      }

      /* Search and filter improvements */
      .dark .search-input {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }

      .dark .filter-button {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        color: rgb(203, 213, 225) !important;
      }

      .dark .filter-button.active {
        background-color: rgb(20, 184, 166) !important;
        color: rgb(17, 24, 39) !important;
      }

      /* Message/chat improvements */
      .dark .message-bubble {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }

      .dark .message-bubble.own {
        background-color: rgb(20, 184, 166) !important;
        color: rgb(17, 24, 39) !important;
      }

      .dark .chat-input {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        color: rgb(241, 245, 249) !important;
      }

      /* Profile and settings improvements */
      .dark .settings-section {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      .dark .profile-card {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      /* Job card improvements */
      .dark .job-card {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      .dark .job-card:hover {
        border-color: rgb(20, 184, 166) !important;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1) !important;
      }

      /* Skill chip improvements */
      .dark .skill-chip {
        background-color: rgb(55, 65, 81) !important;
        color: rgb(203, 213, 225) !important;
        border-color: rgb(75, 85, 99) !important;
      }

      .dark .skill-chip:hover {
        border-color: rgb(20, 184, 166) !important;
        color: rgb(20, 184, 166) !important;
      }

      .dark .skill-chip.selected {
        background-color: rgb(20, 184, 166) !important;
        color: rgb(17, 24, 39) !important;
        border-color: rgb(20, 184, 166) !important;
      }

      /* Dropdown menu improvements */
      .dark .dropdown-menu {
        background-color: rgb(31, 41, 55) !important;
        border-color: rgb(55, 65, 81) !important;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1) !important;
      }

      .dark .dropdown-item {
        color: rgb(203, 213, 225) !important;
      }

      .dark .dropdown-item:hover {
        background-color: rgb(55, 65, 81) !important;
        color: rgb(20, 184, 166) !important;
      }

      /* Tooltip improvements */
      .dark .tooltip {
        background-color: rgb(17, 24, 39) !important;
        color: rgb(241, 245, 249) !important;
        border-color: rgb(55, 65, 81) !important;
      }

      /* Progress bar improvements */
      .dark .progress-bar {
        background-color: rgb(55, 65, 81) !important;
      }

      .dark .progress-fill {
        background-color: rgb(20, 184, 166) !important;
      }

      /* Status indicators */
      .dark .status-dot {
        border-color: rgb(31, 41, 55) !important;
      }

      /* Scrollbar improvements for dark mode */
      .dark::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .dark::-webkit-scrollbar-track {
        background: rgb(31, 41, 55);
      }

      .dark::-webkit-scrollbar-thumb {
        background: rgb(55, 65, 81);
        border-radius: 4px;
      }

      .dark::-webkit-scrollbar-thumb:hover {
        background: rgb(75, 85, 99);
      }

      /* Firefox scrollbar */
      .dark {
        scrollbar-width: thin;
        scrollbar-color: rgb(55, 65, 81) rgb(31, 41, 55);
      }

      /* Enhanced contrast for important elements */
      .dark .text-important {
        color: rgb(241, 245, 249) !important;
        font-weight: 500;
      }

      .dark .bg-important {
        background-color: rgb(31, 41, 55) !important;
        border: 1px solid rgb(55, 65, 81) !important;
      }

      /* Focus improvements */
      .dark *:focus-visible {
        outline: 2px solid rgb(20, 184, 166) !important;
        outline-offset: 2px !important;
      }

      /* Selection improvements */
      .dark ::selection {
        background-color: rgba(20, 184, 166, 0.3) !important;
        color: rgb(241, 245, 249) !important;
      }
    `;

    // Create or update the style element
    let styleElement = document.getElementById('fixly-dark-mode-fixes');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'fixly-dark-mode-fixes';
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = darkModeStyles;

    return () => {
      // Cleanup on unmount
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  return null; // This component only injects styles
}

// Component-level dark mode wrapper
export function DarkModeWrapper({ children, className = '' }) {
  return (
    <div className={`dark-mode-enhanced ${className}`}>
      <DarkModeEnhancer />
      {children}
    </div>
  );
}

// Hook for applying dark mode fixes to specific elements
export function useDarkModeClass(elementRef, additionalClasses = []) {
  useEffect(() => {
    if (!elementRef?.current) return;

    const element = elementRef.current;
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
      element.classList.add('dark-mode-enhanced', ...additionalClasses);
    } else {
      element.classList.remove('dark-mode-enhanced', ...additionalClasses);
    }

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          if (isDark) {
            element.classList.add('dark-mode-enhanced', ...additionalClasses);
          } else {
            element.classList.remove('dark-mode-enhanced', ...additionalClasses);
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      observer.disconnect();
    };
  }, [elementRef, additionalClasses]);
}

export default DarkModeEnhancer;