'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare, Phone, Shield, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { EmergencyProceduresSection } from '@/components/safety/EmergencyProceduresSection';
import { InsuranceSection } from '@/components/safety/InsuranceSection';
import { SafetyFeaturesSection } from '@/components/safety/SafetyFeaturesSection';
import { SafetyTipsSection } from '@/components/safety/SafetyTipsSection';

import {
  emergencyProcedures,
  insuranceInfo,
  safetyFeatures,
  safetyTips,
} from './safety.data';

export default function SafetyPage(): React.JSX.Element {
  const router = useRouter();

  const handleGetStarted = (): void => {
    sessionStorage.setItem('selectedRole', 'hirer');
    router.push('/auth/signup?role=hirer');
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
                Get Started
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
            <Shield className="h-10 w-10 text-fixly-accent" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-4xl font-bold text-fixly-text md:text-5xl"
          >
            Safety &<span className="block text-fixly-accent">Security</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 text-xl text-fixly-text-light"
          >
            Your safety is our top priority. Learn about our comprehensive security measures and
            safety guidelines.
          </motion.p>
        </div>
      </section>

      <SafetyFeaturesSection features={safetyFeatures} />
      <SafetyTipsSection tips={safetyTips} />
      <EmergencyProceduresSection procedures={emergencyProcedures} />
      <InsuranceSection info={insuranceInfo} />

      {/* Contact Support */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-fixly-card p-12 shadow-fixly-lg"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent/10">
              <Phone className="h-8 w-8 text-fixly-accent" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">Need Help?</h2>
            <p className="mb-8 text-xl text-fixly-text-light">
              Our safety team is available 24/7 to assist with any concerns
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <div className="rounded-lg bg-fixly-accent/10 p-3">
                  <Phone className="h-5 w-5 text-fixly-accent" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-fixly-text">24/7 Safety Hotline</div>
                  <div className="text-fixly-text-light">1-800-FIXLY-HELP</div>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-4">
                <div className="rounded-lg bg-fixly-accent/10 p-3">
                  <MessageSquare className="h-5 w-5 text-fixly-accent" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-fixly-text">Live Chat Support</div>
                  <div className="text-fixly-text-light">Available in your dashboard</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/contact')}
              className="btn-primary hover-lift mt-8 px-8 py-4 text-lg"
            >
              Contact Support
            </button>
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
