'use client';

import { motion } from 'framer-motion';

import type { StatCard } from './applications.types';

type ApplicationStatCardsProps = {
  statCards: StatCard[];
};

export default function ApplicationStatCards({ statCards }: ApplicationStatCardsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="card"
        >
          <div className="flex items-center">
            <div className={`rounded-lg p-3 ${stat.containerClass}`}>
              <stat.icon className={`h-6 w-6 ${stat.iconClass}`} />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-fixly-text">{stat.value}</div>
              <div className="text-sm text-fixly-text-muted">{stat.label}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
