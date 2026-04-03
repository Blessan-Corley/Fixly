import type { Session } from 'next-auth';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

export type Role = 'hirer' | 'fixer' | 'admin';
export type AuthMethod = 'email' | 'google' | 'phone';

export type AppNotification = {
  id?: string;
  messageId?: string;
  read?: boolean;
  readAt?: string;
  [key: string]: unknown;
};

export type AppUser = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: Role;
  phone?: string;
  authMethod?: AuthMethod;
  isVerified?: boolean;
  isRegistered?: boolean;
  banned?: boolean;
  banReason?: string;
  banExpiresAt?: string | number | Date;
  [key: string]: unknown;
};

export type AppContextValue = {
  user: AppUser | null;
  setUser: Dispatch<SetStateAction<AppUser | null>>;
  loading: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  clearNotification: (messageId: string) => void;
  clearAllNotifications: () => void;
  replaceNotifications: (items: AppNotification[]) => void;
  updateUser: (userData: Partial<AppUser>) => void;
  session: Session | null;
  isAuthenticated: boolean;
  error: string | null;
  isOnline: boolean;
  checkConnection: () => boolean;
};

export type AppProviderContentProps = {
  children: ReactNode;
};

export type ProvidersProps = {
  children: ReactNode;
};

export type LoadingSpinnerProps = {
  size?: 'small' | 'default' | 'large';
};

export type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: Role[];
  fallback?: ReactNode;
};

export type RoleGuardProps = {
  children: ReactNode;
  roles: Role[];
  fallback?: ReactNode;
};
