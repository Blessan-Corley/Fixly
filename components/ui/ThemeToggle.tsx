'use client';

import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useTheme } from '../../contexts/ThemeContext';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './primitives/DropdownMenu';

type ThemeToggleVariant = 'button' | 'dropdown';

export interface ThemeToggleProps {
  variant?: ThemeToggleVariant;
  className?: string;
}

function ThemeIcon({ isDark, isSystem }: { isDark: boolean; isSystem: boolean }) {
  const iconClassName =
    'h-5 w-5 text-fixly-text transition-all duration-200 group-hover:text-fixly-primary';

  if (isSystem) {
    return <Monitor className={iconClassName} />;
  }

  if (isDark) {
    return <Moon className={iconClassName} />;
  }

  return <Sun className={iconClassName} />;
}

export default function ThemeToggle({ variant = 'button', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme, setLightTheme, setDarkTheme, setSystemTheme, isDark, isSystem } =
    useTheme();
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`h-10 w-10 animate-pulse rounded-xl border border-fixly-border bg-fixly-card ${className}`}
      />
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={`group relative flex h-10 w-10 items-center justify-center rounded-xl border border-fixly-border bg-fixly-card transition-all duration-200 hover:border-fixly-primary hover:bg-fixly-card-hover ${className}`}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span className="transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
          <ThemeIcon isDark={isDark} isSystem={isSystem} />
        </span>
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-fixly-border bg-fixly-card transition-all duration-200 hover:border-fixly-primary hover:bg-fixly-card-hover"
          >
            <span className="transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
              <ThemeIcon isDark={isDark} isSystem={isSystem} />
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-48 rounded-xl border border-fixly-border bg-fixly-card p-0 py-2 shadow-fixly-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DropdownMenuItem
            onSelect={setLightTheme}
            className="cursor-pointer rounded-none px-4 py-2 text-sm text-fixly-text transition-colors focus:bg-fixly-bg-secondary"
          >
            <Sun className="mr-3 h-4 w-4" />
            Light Mode
            {theme === 'light' && <Check className="ml-auto h-4 w-4 text-fixly-primary" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={setDarkTheme}
            className="cursor-pointer rounded-none px-4 py-2 text-sm text-fixly-text transition-colors focus:bg-fixly-bg-secondary"
          >
            <Moon className="mr-3 h-4 w-4" />
            Dark Mode
            {theme === 'dark' && <Check className="ml-auto h-4 w-4 text-fixly-primary" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={setSystemTheme}
            className="cursor-pointer rounded-none px-4 py-2 text-sm text-fixly-text transition-colors focus:bg-fixly-bg-secondary"
          >
            <Monitor className="mr-3 h-4 w-4" />
            System
            {theme === 'system' && <Check className="ml-auto h-4 w-4 text-fixly-primary" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
