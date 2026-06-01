// app/terms/page.js
'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Scale } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { termsSections } from './terms.data';

export default function TermsConditionsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-fixly-bg">
      <header className="border-b border-fixly-border bg-fixly-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-fixly-text">Terms & Conditions</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <Scale className="mx-auto mb-6 h-16 w-16 text-fixly-accent" />
          <h1 className="mb-4 text-4xl font-bold text-fixly-text">Terms & Conditions</h1>
          <p className="mx-auto mb-6 max-w-3xl text-xl text-fixly-text-light">
            Please read these terms and conditions carefully before using our platform. By using
            Fixly, you agree to be bound by these terms.
          </p>
          <div className="text-sm text-fixly-text-muted">Last updated: May 15, 2025</div>
        </motion.div>

        <div className="card mb-12">
          <h2 className="mb-4 text-xl font-semibold text-fixly-text">Table of Contents</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {termsSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center rounded-lg p-3 transition-colors hover:bg-fixly-bg"
              >
                <section.icon className="mr-3 h-5 w-5 text-fixly-accent" />
                <span className="text-fixly-text hover:text-fixly-accent">{section.title}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-12">
          {termsSections.map((section, index) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="card"
            >
              <div className="mb-6 flex items-center">
                <section.icon className="mr-4 h-8 w-8 text-fixly-accent" />
                <h2 className="text-2xl font-bold text-fixly-text">{section.title}</h2>
              </div>
              <div className="space-y-4">
                {section.content.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    {'subtitle' in item && item.subtitle ? (
                      <h3 className="mb-2 text-lg font-semibold text-fixly-text">{item.subtitle}</h3>
                    ) : null}
                    <p className="leading-relaxed text-fixly-text-light">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mt-12"
        >
          <h2 className="mb-4 text-2xl font-bold text-fixly-text">Changes to Terms</h2>
          <p className="mb-4 text-fixly-text-light">
            Fixly reserves the right to modify these terms at any time. We will notify users of
            significant changes via email or platform notifications.
          </p>
          <p className="text-fixly-text-light">
            Your continued use of the platform after changes indicates your acceptance of the
            updated terms.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mt-12"
        >
          <h2 className="mb-4 text-2xl font-bold text-fixly-text">Questions About These Terms?</h2>
          <p className="mb-4 text-fixly-text-light">
            If you have any questions about these Terms & Conditions, please contact us:
            blessancorley@gmail.com , call : +91 9976768211
          </p>
          <div className="flex flex-col gap-4 md:flex-row">
            <a href="mailto:blessancorley@gmail.com" className="btn-primary flex items-center justify-center">
              Email Support
            </a>
            <a href="tel:+919976768211" className="btn-secondary flex items-center justify-center">
              Call Support
            </a>
          </div>
        </motion.div>
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
