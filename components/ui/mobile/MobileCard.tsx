'use client';

import type { MouseEventHandler, ReactNode } from 'react';

type PaddingSize = 'none' | 'small' | 'default' | 'large';

export interface MobileCardProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
  padding?: PaddingSize;
  hover?: boolean;
}

const PADDING_CLASSES: Record<PaddingSize, string> = {
  none: '',
  small: 'p-3',
  default: 'p-4',
  large: 'p-6',
};

export function MobileCard({
  children,
  onClick,
  className = '',
  padding = 'default',
  hover = true,
}: MobileCardProps) {
  return (
    <div
      className={`
        rounded-xl
        border border-fixly-border
        bg-fixly-card
        ${PADDING_CLASSES[padding]}
        ${onClick ? 'cursor-pointer' : ''}
        ${hover ? 'transition-shadow hover:shadow-md' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
