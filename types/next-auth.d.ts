// Phase 2: Added typed CSRF token support to authenticated sessions and JWTs.
import type { DefaultSession, DefaultUser } from 'next-auth';
import type { JWT as DefaultJWT } from 'next-auth/jwt';

type Role = 'hirer' | 'fixer' | 'admin';
type AuthMethod = 'email' | 'google' | 'phone';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id?: string;
      role?: Role;
      username?: string;
      phone?: string;
      isVerified?: boolean;
      emailVerified?: boolean;
      phoneVerified?: boolean;
      banned?: boolean;
      isActive?: boolean;
      authMethod?: AuthMethod;
      needsOnboarding?: boolean;
      isRegistered?: boolean;
      isNewUser?: boolean;
      googleId?: string;
      csrfToken?: string;
    };
  }

  interface User extends DefaultUser {
    id?: string;
    role?: Role;
    username?: string;
    phone?: string;
    isVerified?: boolean;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    banned?: boolean;
    isActive?: boolean;
    authMethod?: AuthMethod;
    needsOnboarding?: boolean;
    isRegistered?: boolean;
    isNewUser?: boolean;
    googleId?: string;
    csrfToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: Role;
    username?: string;
    phone?: string;
    isVerified?: boolean;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    banned?: boolean;
    isActive?: boolean;
    deleted?: boolean;
    authMethod?: AuthMethod;
    needsOnboarding?: boolean;
    isRegistered?: boolean;
    isNewUser?: boolean;
    googleId?: string;
    sessionVersion?: number;
    authDataRefreshedAt?: number;
    csrfToken?: string;
  }
}
