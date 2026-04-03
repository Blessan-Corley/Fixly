'use client';

import { motion } from 'framer-motion';
import { BookOpen, Bug, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AdditionalResourcesSection(): React.JSX.Element {
  const router = useRouter();

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            More Ways to Get Help
          </h2>
          <p className="text-xl text-fixly-text-light">
            Explore additional resources and community support
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="hover-lift rounded-xl bg-fixly-card p-6 text-center transition-all duration-200 hover:shadow-fixly"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fixly-accent/10">
              <BookOpen className="h-6 w-6 text-fixly-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-fixly-text">Help Documentation</h3>
            <p className="mb-4 text-sm text-fixly-text-light">
              Comprehensive guides and tutorials for all platform features
            </p>
            <button onClick={() => router.push('/resources')} className="btn-secondary text-sm">
              Browse Docs
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="hover-lift rounded-xl bg-fixly-card p-6 text-center transition-all duration-200 hover:shadow-fixly"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fixly-accent/10">
              <Users className="h-6 w-6 text-fixly-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-fixly-text">Community Forum</h3>
            <p className="mb-4 text-sm text-fixly-text-light">
              Connect with other users and get help from the community
            </p>
            <button className="btn-secondary text-sm">Join Community</button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="hover-lift rounded-xl bg-fixly-card p-6 text-center transition-all duration-200 hover:shadow-fixly"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fixly-accent/10">
              <Bug className="h-6 w-6 text-fixly-accent" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-fixly-text">Report a Bug</h3>
            <p className="mb-4 text-sm text-fixly-text-light">
              Found a technical issue? Help us improve by reporting bugs
            </p>
            <button className="btn-secondary text-sm">Report Issue</button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
