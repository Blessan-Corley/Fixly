'use client';

import { createContext, useContext } from 'react';

import type { AblyContextValue } from './types';

export const AblyContext = createContext<AblyContextValue | undefined>(undefined);

export function useAbly(): AblyContextValue {
  const context = useContext(AblyContext);
  if (!context) {
    throw new Error('useAbly must be used within an AblyProvider');
  }
  return context;
}
