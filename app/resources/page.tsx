'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Lightbulb, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { CommunitySection } from '@/components/resources/CommunitySection';
import { ResourceCategoriesSection } from '@/components/resources/ResourceCategoriesSection';
import { WebinarsSection } from '@/components/resources/WebinarsSection';

import { communityResources, resourceCategories, webinars } from './resources.data';

export default function ResourcesPage() {
  const router = useRouter();

  const handleGetStarted = () => {
    sessionStorage.setItem('selectedRole', 'fixer');
    router.push('/auth/signup?role=fixer');
  };

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-fixly-border bg-fixly-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center transition-opacity hover:opacity-80"
            >
              <Wrench className="mr-2 h-8 w-8 text-fixly-accent" />
              <span className="text-2xl font-bold text-fixly-text">Fixly</span>
            </button>
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/auth/signin')} className="btn-ghost">
                Sign In
              </button>
              <button onClick={handleGetStarted} className="btn-primary">
                Become a Fixer
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pb-12 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-fixly-accent/10"
          >
            <Lightbulb className="h-10 w-10 text-fixly-accent" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-4xl font-bold text-fixly-text md:text-5xl"
          >
            Resources for<span className="block text-fixly-accent">Success</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 text-xl text-fixly-text-light"
          >
            Everything you need to succeed as a service provider on Fixly
          </motion.p>
        </div>
      </section>

      <ResourceCategoriesSection categories={resourceCategories} />
      <WebinarsSection webinarList={webinars} />
      <CommunitySection resources={communityResources} />

      {/* CTA */}
      <section className="bg-fixly-card py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-fixly-bg p-12 shadow-fixly-lg"
          >
            <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
              Ready to Start Your Journey?
            </h2>
            <p className="mb-8 text-xl text-fixly-text-light">
              Join thousands of successful service providers on Fixly
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button onClick={handleGetStarted} className="btn-primary hover-lift px-8 py-4 text-lg">
                Become a Fixer
              </button>
              <button
                onClick={() => router.push('/contact')}
                className="btn-secondary hover-lift px-8 py-4 text-lg"
              >
                Contact Support
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Back to Home */}
      <div className="fixed bottom-6 left-6">
        <button
          onClick={() => router.push('/')}
          className="hover-lift rounded-full border border-fixly-border bg-fixly-card p-3 shadow-fixly transition-all duration-200 hover:bg-fixly-card/80"
        >
          <ArrowLeft className="h-5 w-5 text-fixly-text" />
        </button>
      </div>
    </div>
  );
}
