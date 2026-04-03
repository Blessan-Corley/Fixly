'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import type { QuickAction } from '../_lib/dashboard.types';

type DashboardQuickActionsProps = {
  quickActions: QuickAction[];
  isMobile: boolean;
};

export function DashboardQuickActions({
  quickActions,
  isMobile,
}: DashboardQuickActionsProps): React.JSX.Element {
  const router = useRouter();

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-fixly-text">Quick Actions</h2>
      </div>

      <div
        className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} mb-8 gap-4`}
      >
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => router.push(action.href)}
              className={`card card-hover relative overflow-hidden p-6 text-left ${
                action.urgent ? 'ring-2 ring-fixly-accent' : ''
              }`}
            >
              <div className="flex items-center">
                <div className={`p-3 ${action.color} rounded-lg text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="font-semibold text-fixly-text">
                    {action.title}
                    {action.urgent && (
                      <span className="ml-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                        Urgent
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-fixly-text-light">{action.description}</div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}
