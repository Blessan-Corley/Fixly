'use client';

import { motion } from 'framer-motion';

import type { AppUser } from '@/app/providers';

import { getGreeting } from '../_lib/dashboard.helpers';
import type { DashboardUser } from '../_lib/dashboard.types';

type DashboardWelcomeHeaderProps = {
  user: DashboardUser | null;
  isMobile: boolean;
};

export function DashboardWelcomeHeader({
  user,
  isMobile,
}: DashboardWelcomeHeaderProps): React.JSX.Element {
  return (
    <div className="mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isMobile ? 'flex flex-col space-y-4' : 'flex items-center justify-between'}`}
      >
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-fixly-text`}>
            {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="mt-1 text-fixly-text-light">
            {user?.role === 'hirer' && 'Ready to get your projects done?'}
            {user?.role === 'fixer' && 'Time to find some great work opportunities!'}
            {user?.role === 'admin' && "Here's what's happening on the platform"}
          </p>
        </div>

        {user?.role === 'fixer' && (user as AppUser & { availableNow?: boolean }).availableNow && (
          <div className="flex items-center rounded-full bg-green-50 px-3 py-1 text-green-600">
            <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
            Available Now
          </div>
        )}
      </motion.div>
    </div>
  );
}
