'use client';

import { motion } from 'framer-motion';

import type { ContactMethod } from './contact.data';

type ContactMethodsGridProps = {
  methods: ContactMethod[];
};

function ContactMethodCard({ method }: { method: ContactMethod }): JSX.Element {
  return (
    <div className={`card p-6 text-center ${method.primary ? 'border-fixly-accent' : ''}`}>
      <method.icon className="mx-auto mb-4 h-12 w-12 text-fixly-accent" />
      <h3 className="mb-2 text-lg font-semibold text-fixly-text">{method.title}</h3>
      <p className="mb-4 text-sm text-fixly-text-muted">{method.description}</p>
      {method.action ? (
        <a
          href={method.action}
          target={method.action.startsWith('http') ? '_blank' : '_self'}
          rel={method.action.startsWith('http') ? 'noopener noreferrer' : ''}
          className="font-medium text-fixly-accent transition-colors hover:text-fixly-accent-dark"
        >
          {method.value}
        </a>
      ) : (
        <span className="font-medium text-fixly-text">{method.value}</span>
      )}
    </div>
  );
}

export default function ContactMethodsGrid({ methods }: ContactMethodsGridProps): JSX.Element {
  const primaryMethods = methods.slice(0, 3);
  const secondaryMethods = methods.slice(3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-16"
    >
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {primaryMethods.map((method, index) => (
          <ContactMethodCard key={index} method={method} />
        ))}
      </div>

      <div className="flex justify-center">
        <div className="grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-2">
          {secondaryMethods.map((method, index) => (
            <ContactMethodCard key={index + 3} method={method} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
