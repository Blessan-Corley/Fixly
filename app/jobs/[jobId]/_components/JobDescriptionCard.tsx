'use client';

import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

type JobDescriptionCardProps = {
  description: string;
};

export function JobDescriptionCard({ description }: JobDescriptionCardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card"
    >
      <h2 className="mb-4 flex items-center text-xl font-bold text-fixly-text">
        <BookOpen className="mr-2 h-5 w-5" />
        Job Description
      </h2>
      <div className="prose max-w-none text-fixly-text-light">
        <p className="whitespace-pre-wrap">{description}</p>
      </div>
    </motion.div>
  );
}
