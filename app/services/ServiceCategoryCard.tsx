'use client';

import { motion } from 'framer-motion';

import type { ServiceCategory } from './services.data';

type ServiceCategoryCardProps = {
  category: ServiceCategory;
  index: number;
  onPostJob: () => void;
};

export default function ServiceCategoryCard({ category, index, onPostJob }: ServiceCategoryCardProps): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="hover-lift rounded-xl bg-fixly-card p-6 transition-all duration-300 hover:shadow-fixly-lg"
    >
      <div className={`${category.color} mb-4 flex h-12 w-12 items-center justify-center rounded-lg`}>
        <category.icon className="h-6 w-6 text-white" />
      </div>

      <h3 className="mb-2 text-xl font-semibold text-fixly-text">{category.name}</h3>
      <p className="mb-4 text-fixly-text-light">{category.description}</p>

      <div className="mb-6 space-y-2">
        {category.services.slice(0, 3).map((service, serviceIndex) => (
          <div key={serviceIndex} className="flex items-center text-sm text-fixly-text-muted">
            <div className="mr-2 h-1.5 w-1.5 rounded-full bg-fixly-accent" />
            {service}
          </div>
        ))}
        {category.services.length > 3 && (
          <div className="text-sm font-medium text-fixly-accent">
            +{category.services.length - 3} more services
          </div>
        )}
      </div>

      <button onClick={onPostJob} className="btn-primary w-full text-sm">
        Find {category.name} Experts
      </button>
    </motion.div>
  );
}
