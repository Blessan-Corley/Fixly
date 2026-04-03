'use client';

import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Briefcase, DollarSign, Target, TrendingUp } from 'lucide-react';

import type { EarningsState } from './earnings.types';
import { formatCurrency } from './earnings.utils';

type EarningsMetricCardsProps = {
  earnings: EarningsState;
};

export default function EarningsMetricCards({ earnings }: EarningsMetricCardsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="mb-2 flex items-center justify-between">
          <div className="rounded-lg bg-green-100 p-3">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex items-center text-sm">
            {earnings.growth.monthly > 0 ? (
              <ArrowUp className="mr-1 h-4 w-4 text-green-600" />
            ) : (
              <ArrowDown className="mr-1 h-4 w-4 text-red-600" />
            )}
            <span className={earnings.growth.monthly > 0 ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(earnings.growth.monthly)}%
            </span>
          </div>
        </div>
        <div className="text-2xl font-bold text-fixly-text">
          {formatCurrency(earnings.thisMonth)}
        </div>
        <div className="text-sm text-fixly-text-muted">This Month</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="rounded-lg bg-blue-100 p-3">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div className="text-2xl font-bold text-fixly-text">{formatCurrency(earnings.total)}</div>
        <div className="text-sm text-fixly-text-muted">Total Earnings</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="rounded-lg bg-fixly-accent/20 p-3">
            <Briefcase className="h-6 w-6 text-fixly-primary" />
          </div>
        </div>
        <div className="text-2xl font-bold text-fixly-text">{earnings.completedJobs}</div>
        <div className="text-sm text-fixly-text-muted">Jobs Completed</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="rounded-lg bg-orange-100 p-3">
            <Target className="h-6 w-6 text-orange-600" />
          </div>
        </div>
        <div className="text-2xl font-bold text-fixly-text">
          {formatCurrency(earnings.averageJobValue)}
        </div>
        <div className="text-sm text-fixly-text-muted">Avg. Job Value</div>
      </motion.div>
    </div>
  );
}
