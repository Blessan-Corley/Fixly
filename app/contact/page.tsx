'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { contactMethods, faqItems, supportCategories } from './contact.data';
import ContactCtaSection from './ContactCtaSection';
import ContactForm from './ContactForm';
import ContactMethodsGrid from './ContactMethodsGrid';
import ContactSupportPanel from './ContactSupportPanel';

export default function ContactPage(): JSX.Element {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-fixly-bg">
      <header className="border-b border-fixly-border bg-fixly-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-fixly-text">Contact Us</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <MessageSquare className="mx-auto mb-6 h-16 w-16 text-fixly-accent" />
          <h1 className="mb-4 text-4xl font-bold text-fixly-text">Get in Touch</h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-fixly-text-light">
            Have questions, feedback, or need help? We&apos;re here to assist you. Our friendly
            support team is ready to help you get the most out of Fixly.
          </p>
        </motion.div>

        <ContactMethodsGrid methods={contactMethods} />

        <div className="grid gap-12 lg:grid-cols-2">
          <ContactForm />
          <ContactSupportPanel supportCategories={supportCategories} faqItems={faqItems} />
        </div>

        <ContactCtaSection />
      </div>

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
