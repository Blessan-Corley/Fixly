'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

import type { CookieType } from './cookies.data';

type CookieTypesProps = {
  cookieTypes: CookieType[];
};

function CookieTypeCard({ type, index }: { type: CookieType; index: number }) {
  return (
    <motion.div
      key={type.title}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="card"
    >
      <div className="mb-4 flex items-center">
        <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fixly-accent/10">
          <type.icon className="h-6 w-6 text-fixly-accent" />
        </div>
        <h3 className="text-xl font-semibold text-fixly-text">{type.title}</h3>
      </div>
      <p className="mb-4 text-fixly-text-light">{type.description}</p>
      <ul className="space-y-2">
        {type.examples.map((example, exampleIndex) => (
          <li key={exampleIndex} className="flex items-start">
            <CheckCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-fixly-accent" />
            <span className="text-sm text-fixly-text-muted">{example}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function CookieTypesSection({ cookieTypes }: CookieTypesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-12"
    >
      <h2 className="mb-8 text-3xl font-bold text-fixly-text">Types of Cookies We Use</h2>

      <div className="mb-8 grid gap-8 md:grid-cols-3">
        {cookieTypes.slice(0, 3).map((type, index) => (
          <CookieTypeCard key={type.title} type={type} index={index} />
        ))}
      </div>

      <div className="flex justify-center">
        <div className="grid max-w-4xl gap-8 md:grid-cols-2">
          {cookieTypes.slice(3).map((type, index) => (
            <CookieTypeCard key={type.title} type={type} index={index + 3} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
