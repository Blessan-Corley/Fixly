'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, HelpCircle, Mail, MessageSquare, Search, Star, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AdditionalResourcesSection } from '@/components/support/AdditionalResourcesSection';
import { FaqSection } from '@/components/support/FaqSection';
import { SupportOptionsSection } from '@/components/support/SupportOptionsSection';

import { faqCategories, faqs, supportOptions } from './support.data';

export default function SupportPage(): React.JSX.Element {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleGetStarted = (): void => {
    sessionStorage.setItem('selectedRole', 'hirer');
    router.push('/auth/signup?role=hirer');
  };

  const toggleFaq = (index: number): void => {
    setExpandedFaq(expandedFaq === index ? null : index);
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
            <HelpCircle className="h-10 w-10 text-fixly-accent" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-4xl font-bold text-fixly-text md:text-5xl"
          >
            How Can We
            <span className="block text-fixly-accent">Help You?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 text-xl text-fixly-text-light"
          >
            Get support, find answers, and connect with our team
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative mx-auto mb-8 max-w-md"
          >
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-fixly-border bg-fixly-card py-3 pl-12 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-fixly-accent"
            />
          </motion.div>
        </div>
      </section>

      <SupportOptionsSection options={supportOptions} />
      <FaqSection
        faqList={faqs}
        categories={faqCategories}
        searchTerm={searchTerm}
        expandedFaq={expandedFaq}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onToggleFaq={toggleFaq}
      />
      <AdditionalResourcesSection />

      {/* Contact CTA */}
      <section className="bg-fixly-card py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-fixly-bg p-12 shadow-fixly-lg"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent/10">
              <Star className="h-8 w-8 text-fixly-accent" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
              Still Need Help?
            </h2>
            <p className="mb-8 text-xl text-fixly-text-light">
              Our support team is here to help you succeed on Fixly
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button className="btn-primary hover-lift px-8 py-4 text-lg">
                <MessageSquare className="mr-2 h-5 w-5" />
                Start Live Chat
              </button>
              <button
                onClick={() => router.push('/contact')}
                className="btn-secondary hover-lift px-8 py-4 text-lg"
              >
                <Mail className="mr-2 h-5 w-5" />
                Send Email
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
