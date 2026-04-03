// Shared types used across auth modules
import type { Profile } from 'next-auth';

export type AuthContext = 'signin' | 'signup';
export type Role = 'hirer' | 'fixer' | 'admin';

export interface AuthCallbackUserLike {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  picture?: string | null;
}

export interface ExtendedProfile extends Profile {
  email?: string;
  name?: string;
  picture?: string;
}

export interface SessionRefreshCache {
  id: string;
  role?: Role;
  username?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  banned?: boolean;
  isActive?: boolean;
  deleted?: boolean;
  location?: unknown;
  skills?: string[];
  subscription?: unknown;
  sessionVersion: number;
  lastUpdated: number;
}

export interface SessionUserCache {
  id: string;
  role?: Role;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  isVerified?: boolean;
  banned?: boolean;
  isActive?: boolean;
  deleted?: boolean;
}

export interface LeanSessionUser {
  _id: { toString(): string };
  role?: Role;
  username?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  banned?: boolean;
  isActive?: boolean;
  deletedAt?: Date | null;
  location?: unknown;
  skills?: string[];
  subscription?: unknown;
  authMethod?: string;
  phone?: string;
  updatedAt?: Date;
}

export interface LeanRoleUser {
  _id: { toString(): string };
  role?: Role;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  isVerified?: boolean;
  banned?: boolean;
  isActive?: boolean;
  deletedAt?: Date | null;
}
