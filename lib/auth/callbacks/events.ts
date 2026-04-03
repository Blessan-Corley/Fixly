import type { NextAuthOptions } from 'next-auth';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

export const authEvents: NextAuthOptions['events'] = {
  async signIn({ user, account, isNewUser }) {
    if (env.NODE_ENV === 'development') {
      logger.info('[Auth] Sign-in event:', {
        userEmail: user.email,
        provider: account?.provider,
        isNewUser,
        needsOnboarding: user.needsOnboarding,
        isRegistered: user.isRegistered,
        userId: user.id,
        userRole: user.role,
      });
    }
  },
};
