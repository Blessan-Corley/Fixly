'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Clock, MapPin, Search, Star, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import ServiceCategoryCard from './ServiceCategoryCard';
import { SERVICE_CATEGORIES } from './services.data';

export default function ServicesPage(): React.ReactElement {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = SERVICE_CATEGORIES.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.services.some((service) => service.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePostJob = (): void => {
    sessionStorage.setItem('selectedRole', 'hirer');
    router.push('/auth/signup?role=hirer');
  };

  return (
    <div className="min-h-screen bg-fixly-bg">
      <header className="sticky top-0 z-50 border-b border-fixly-border bg-fixly-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
              <Wrench className="mr-2 h-8 w-8 text-fixly-accent" />
              <span className="text-2xl font-bold text-fixly-text">Fixly</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin" className="btn-ghost">
                Sign In
              </Link>
              <button onClick={handlePostJob} className="btn-primary">
                Post a Job
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="px-4 pb-12 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 text-4xl font-bold text-fixly-text md:text-5xl"
          >
            Find Services
            <span className="block text-fixly-accent">Near You</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 text-xl text-fixly-text-light"
          >
            Connect with verified professionals for all your service needs
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative mx-auto mb-8 max-w-md"
          >
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); }}
              className="w-full rounded-xl border border-fixly-border bg-fixly-card py-3 pl-12 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-fixly-accent"
            />
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCategories.map((category, index) => (
              <ServiceCategoryCard
                key={category.id}
                category={category}
                index={index}
                onPostJob={handlePostJob}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-fixly-card py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
              Why Choose Fixly Services?
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-fixly-text-light">
              Quality service providers you can trust
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Star, label: 'Verified Professionals', body: 'All service providers undergo background checks and skill verification', delay: 0 },
              { icon: Clock, label: 'Quick Response', body: 'Get responses from qualified professionals within hours', delay: 0.1 },
              { icon: MapPin, label: 'Local Experts', body: 'Connect with skilled professionals in your local area', delay: 0.2 },
            ].map(({ icon: Icon, label, body, delay }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent/10">
                  <Icon className="h-8 w-8 text-fixly-accent" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-fixly-text">{label}</h3>
                <p className="text-fixly-text-light">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-fixly-card p-12 shadow-fixly-lg"
          >
            <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mb-8 text-xl text-fixly-text-light">
              Post your job and connect with qualified service professionals today
            </p>
            <button onClick={handlePostJob} className="btn-primary hover-lift px-8 py-4 text-lg">
              Post a Job Now
            </button>
          </motion.div>
        </div>
      </section>

      <div className="fixed bottom-6 left-6">
        <Link
          href="/"
          aria-label="Back to home"
          className="hover-lift block rounded-full border border-fixly-border bg-fixly-card p-3 shadow-fixly transition-all duration-200 hover:bg-fixly-card/80"
        >
          <ArrowLeft className="h-5 w-5 text-fixly-text" />
        </Link>
      </div>
    </div>
  );
}
