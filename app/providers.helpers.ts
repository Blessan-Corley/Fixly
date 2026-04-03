'use client';

import { createContext } from 'react';

import type { AppContextValue, Role } from './providers.types';

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isPendingSessionId = (value: string): boolean =>
  value.startsWith('temp_') || value.startsWith('tmp_') || value.startsWith('pending_google:');

export const isTemporaryUsername = (value: string | null | undefined): boolean =>
  typeof value === 'string' && (value.startsWith('temp_') || value.startsWith('tmp_'));

export const isRole = (value: unknown): value is Role =>
  value === 'hirer' || value === 'fixer' || value === 'admin';
