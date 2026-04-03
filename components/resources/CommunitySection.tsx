'use client';

import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

import type { communityResources } from '@/app/resources/resources.data';

type Props = {
  resources: typeof communityResources;
};

export function CommunitySection({ resources }: Props) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            Community & Support
          </h2>
          <p className="text-xl text-fixly-text-light">
            Connect with fellow service providers and get the support you need
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {resources.map((resource, index) => (
            <motion.div
              key={resource.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="hover-lift rounded-xl bg-fixly-card p-6 text-center transition-all duration-200 hover:shadow-fixly"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fixly-accent/10">
                <resource.icon className="h-6 w-6 text-fixly-accent" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-fixly-text">{resource.title}</h3>
              <p className="mb-4 text-sm text-fixly-text-light">{resource.description}</p>
              <button className="mx-auto flex items-center justify-center text-sm font-medium text-fixly-accent transition-colors hover:text-fixly-accent/80">
                Visit <ExternalLink className="ml-2 h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
