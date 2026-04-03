'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Cookie, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { COOKIE_TYPES, THIRD_PARTY_SERVICES } from './cookies.data';
import CookieTypesSection from './CookieTypesSection';

export default function CookiesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-fixly-bg">
      <header className="border-b border-fixly-border bg-fixly-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-fixly-text">Cookie Policy</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-fixly-accent/10">
            <Cookie className="h-10 w-10 text-fixly-accent" />
          </div>
          <h1 className="mb-6 text-4xl font-bold text-fixly-text md:text-5xl">
            How Fixly Uses Cookies
          </h1>
          <p className="text-xl text-fixly-text-light">
            Learn about how we use cookies to improve your experience on our platform
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mb-12"
        >
          <h2 className="mb-6 text-3xl font-bold text-fixly-text">What Are Cookies?</h2>
          <p className="mb-4 leading-relaxed text-fixly-text-light">
            As is common practice with almost all professional websites, Fixly uses cookies, which
            are tiny files that are downloaded to your device, to improve your experience. These
            small text files help us remember your preferences, keep you logged in, and understand
            how you use our service marketplace.
          </p>
          <p className="leading-relaxed text-fixly-text-light">
            This page describes what information cookies gather, how we use it, and why we sometimes
            need to store these cookies. We&apos;ll also explain how you can control these cookies,
            though disabling some may affect certain features of Fixly&apos;s functionality.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mb-12"
        >
          <h2 className="mb-6 text-3xl font-bold text-fixly-text">How Fixly Uses Cookies</h2>
          <p className="mb-6 leading-relaxed text-fixly-text-light">
            We use cookies for various reasons to enhance your experience on Fixly. Unfortunately,
            in most cases, there are no industry-standard options for disabling cookies without
            completely disabling the functionality they provide to our service marketplace.
          </p>
          <p className="leading-relaxed text-fixly-text-light">
            We recommend leaving all cookies enabled if you&apos;re unsure whether you need them, as
            they may be used to provide services you use on Fixly, such as job posting, fixer
            matching, and secure payments.
          </p>
        </motion.div>

        <CookieTypesSection cookieTypes={COOKIE_TYPES} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mb-12"
        >
          <h2 className="mb-6 text-3xl font-bold text-fixly-text">Third-Party Services</h2>
          <p className="mb-6 leading-relaxed text-fixly-text-light">
            Fixly uses trusted third-party services to provide certain features. These services may
            set their own cookies to enable functionality such as analytics, authentication, and
            social media integration.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-fixly-border">
                  <th className="px-4 py-3 text-left font-semibold text-fixly-text">Service</th>
                  <th className="px-4 py-3 text-left font-semibold text-fixly-text">Purpose</th>
                  <th className="px-4 py-3 text-left font-semibold text-fixly-text">Type</th>
                </tr>
              </thead>
              <tbody>
                {THIRD_PARTY_SERVICES.map((service) => (
                  <tr key={service.name} className="border-b border-fixly-border/50">
                    <td className="px-4 py-3 text-fixly-text">{service.name}</td>
                    <td className="px-4 py-3 text-fixly-text-light">{service.purpose}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-fixly-accent/10 px-2.5 py-0.5 text-xs font-medium text-fixly-accent">
                        {service.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mb-12"
        >
          <h2 className="mb-6 text-3xl font-bold text-fixly-text">
            Managing Your Cookie Preferences
          </h2>
          <p className="mb-4 leading-relaxed text-fixly-text-light">
            You can control and manage cookies in several ways. Most web browsers automatically
            accept cookies, but you can usually modify your browser settings to decline cookies if
            you prefer.
          </p>
          <p className="mb-6 leading-relaxed text-fixly-text-light">
            Please note that disabling cookies may affect the functionality of Fixly and many other
            websites. Some features like user authentication, job applications, and personalized
            recommendations may not work properly without cookies enabled.
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
            <div className="flex items-start">
              <Shield className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <h4 className="mb-2 font-semibold text-amber-800 dark:text-amber-200">
                  Important Note
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Disabling essential cookies will prevent you from using core Fixly features such
                  as posting jobs, applying for work, making payments, and accessing your dashboard.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card"
        >
          <h2 className="mb-6 text-3xl font-bold text-fixly-text">More Information</h2>
          <p className="mb-6 leading-relaxed text-fixly-text-light">
            We hope this clarifies how Fixly uses cookies. If there&apos;s something you&apos;re
            unsure about, it&apos;s usually safer to leave cookies enabled in case they interact
            with features you use on our platform.
          </p>
          <p className="mb-6 leading-relaxed text-fixly-text-light">
            If you're still looking for more information or have questions about our cookie policy,
            please don't hesitate to contact us through one of our preferred methods:
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <a
              href="mailto:blessancorley@gmail.com"
              className="btn-primary flex items-center justify-center"
            >
              Email Support
            </a>
            <button onClick={() => { router.push('/contact'); }} className="btn-secondary">
              Contact Form
            </button>
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-6 left-6">
        <button
          onClick={() => { router.push('/'); }}
          className="hover-lift rounded-full border border-fixly-border bg-fixly-card p-3 shadow-fixly transition-all duration-200 hover:bg-fixly-card/80"
        >
          <ArrowLeft className="h-5 w-5 text-fixly-text" />
        </button>
      </div>
    </div>
  );
}
