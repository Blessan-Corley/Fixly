'use client';

import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

export interface NavigationItem {
  href: string;
  name: string;
  icon: LucideIcon;
  current?: boolean;
  count?: number;
  highlight?: boolean;
  badge?: string;
}

interface UseMobileNavResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useMobileNav(): UseMobileNavResult {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
