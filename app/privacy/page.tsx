// app/privacy/page.js
'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Mail, MapPin, Phone, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { privacySections } from './privacy.data';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-fixly-bg">
      <header className="border-b border-fixly-border bg-fixly-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-fixly-text">Privacy Policy</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <Shield className="mx-auto mb-6 h-16 w-16 text-fixly-accent" />
          <h1 className="mb-4 text-4xl font-bold text-fixly-text">Privacy Policy</h1>
          <p className="mx-auto mb-6 max-w-3xl text-xl text-fixly-text-light">
            Your privacy is important to us. This policy explains how Fixly collects, uses, and
            protects your personal information.
          </p>
          <div className="text-sm text-fixly-text-muted">Last updated: May 15, 2025</div>
        </motion.div>

        <div className="card mb-12">
          <h2 className="mb-4 text-xl font-semibold text-fixly-text">Table of Contents</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {privacySections.map((section) => (
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
          {privacySections.map((section, index) => (
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
              <div className="space-y-6">
                {section.content.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    <h3 className="mb-2 text-lg font-semibold text-fixly-text">{item.subtitle}</h3>
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
          <h2 className="mb-6 text-2xl font-bold text-fixly-text">Contact Us</h2>
          <p className="mb-6 text-fixly-text-light">
            If you have any questions about this Privacy Policy or our data practices, please
            contact us:
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex items-center">
              <Mail className="mr-3 h-6 w-6 text-fixly-accent" />
              <div>
                <div className="font-medium text-fixly-text">Email</div>
                <a href="mailto:blessancorley@gmail.com" className="text-fixly-accent hover:text-fixly-accent-dark">
                  blessancorley@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-center">
              <Phone className="mr-3 h-6 w-6 text-fixly-accent" />
              <div>
                <div className="font-medium text-fixly-text">Phone</div>
                <a href="tel:+919976768211" className="text-fixly-accent hover:text-fixly-accent-dark">
                  +91 9976768211
                </a>
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-3 h-6 w-6 text-fixly-accent" />
              <div>
                <div className="font-medium text-fixly-text">Address</div>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=11.000044,77.080355"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer text-fixly-text-muted transition-colors hover:text-fixly-accent"
                >
                  Coimbatore, Tamil Nadu, India
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mt-12"
        >
          <h2 className="mb-4 text-2xl font-bold text-fixly-text">Updates to This Policy</h2>
          <p className="mb-4 text-fixly-text-light">
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
          <p className="text-fixly-text-light">
            We encourage you to review this Privacy Policy periodically for any changes. Changes to
            this Privacy Policy are effective when they are posted on this page.
          </p>
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
