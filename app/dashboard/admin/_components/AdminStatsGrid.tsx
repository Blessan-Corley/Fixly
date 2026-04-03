'use client';

import { motion } from 'framer-motion';
import { Activity, AlertCircle, Briefcase, Users } from 'lucide-react';

import type { AdminStats } from '@/app/dashboard/admin/_lib/admin.types';

type AdminStatsGridProps = {
  stats: AdminStats;
  isFetching: boolean;
};

export function AdminStatsGrid({ stats, isFetching }: AdminStatsGridProps): React.JSX.Element {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {isFetching && (
        <div className="col-span-full grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl border border-fixly-border bg-fixly-bg"
            />
          ))}
        </div>
      )}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="flex items-center">
          <div className="rounded-lg bg-fixly-accent/10 p-3">
            <Users className="h-6 w-6 text-fixly-accent" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">{stats.totalUsers}</div>
            <div className="text-sm text-fixly-text-muted">Total Users</div>
            <div className="text-xs text-fixly-text-light">Non-admin accounts</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="flex items-center">
          <div className="rounded-lg bg-green-100 p-3">
            <Briefcase className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">{stats.totalJobs}</div>
            <div className="text-sm text-fixly-text-muted">Total Jobs</div>
            <div className="text-xs text-green-600">{stats.completedJobs} completed</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center">
          <div className="rounded-lg bg-blue-100 p-3">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">{stats.activeJobs}</div>
            <div className="text-sm text-fixly-text-muted">Active Jobs</div>
            <div className="text-xs text-blue-600">Open or in progress</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="flex items-center">
          <div className="rounded-lg bg-red-100 p-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-fixly-text">{stats.totalDisputes}</div>
            <div className="text-sm text-fixly-text-muted">Active Disputes</div>
            <div className="text-xs text-red-600">{stats.totalApplications} total applications</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
