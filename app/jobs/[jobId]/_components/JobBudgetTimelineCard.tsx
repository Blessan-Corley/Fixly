'use client';

import { motion } from 'framer-motion';
import { DollarSign, Timer } from 'lucide-react';

import { formatCurrency } from '../_lib/jobDetails.formatters';
import type { JobDetails } from '../_lib/jobDetails.types';

type JobBudgetTimelineCardProps = {
  job: JobDetails;
};

export function JobBudgetTimelineCard({ job }: JobBudgetTimelineCardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card"
    >
      <h2 className="mb-4 text-xl font-bold text-fixly-text">Budget & Timeline</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex items-center">
          <div className="mr-4 rounded-lg bg-green-50 p-3">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-fixly-text-light">Budget</p>
            <p className="text-lg font-semibold text-fixly-text">
              {job.budget.type === 'fixed'
                ? formatCurrency(job.budget.amount)
                : job.budget.type === 'range'
                  ? `${formatCurrency(job.budget.min)} - ${formatCurrency(job.budget.max)}`
                  : 'Negotiable'}
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <div className="mr-4 rounded-lg bg-blue-50 p-3">
            <Timer className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-fixly-text-light">Expected Duration</p>
            <p className="text-lg font-semibold text-fixly-text">{job.timelineExpected}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
