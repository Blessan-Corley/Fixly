'use client';

import type { ReactNode } from 'react';

type SafeAreaEdge = 'top' | 'bottom' | 'left' | 'right';

export interface MobileSafeAreaProps {
  children: ReactNode;
  className?: string;
  edges?: SafeAreaEdge[];
}

const SAFE_AREA_CLASSES: Record<SafeAreaEdge, string> = {
  top: 'pt-safe-area-top',
  bottom: 'pb-safe-area-bottom',
  left: 'pl-safe-area-left',
  right: 'pr-safe-area-right',
};

export function MobileSafeArea({
  children,
  className = '',
  edges = ['top', 'bottom', 'left', 'right'],
}: MobileSafeAreaProps) {
  const appliedClasses = edges.map((edge) => SAFE_AREA_CLASSES[edge]).join(' ');

  return <div className={`${appliedClasses} ${className}`}>{children}</div>;
}
