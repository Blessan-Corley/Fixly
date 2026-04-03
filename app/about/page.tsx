'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { ContactSection } from '@/components/about/ContactSection';
import { FoundersSection } from '@/components/about/FoundersSection';
import { ImpactSection } from '@/components/about/ImpactSection';
import { ValuesSection } from '@/components/about/ValuesSection';
import ThemeToggle from '@/components/ui/ThemeToggle';

import { founders, stats, values } from './about.data';

export default function AboutUsPage(): React.JSX.Element {
  const { data: session } = useSession();
  const homeHref = session ? '/dashboard' : '/';

  return (
    <div className="min-h-screen bg-fixly-bg">
      <header className="border-b border-fixly-border bg-fixly-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link href={homeHref} className="btn-ghost mr-4 flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {session ? 'Back to Dashboard' : 'Back to Home'}
              </Link>
              <Wrench className="mr-2 h-8 w-8 text-fixly-accent" />
              <span className="text-2xl font-bold text-fixly-text">Fixly</span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {!session ? (
                <>
                  <Link href="/auth/signin" className="btn-ghost">
                    Sign In
                  </Link>
                  <Link href="/auth/signup" className="btn-primary">
                    Get Started
                  </Link>
                </>
              ) : (
                <Link href="/dashboard" className="btn-primary">
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="mb-6 text-4xl font-bold text-fixly-text md:text-6xl">
              About <span className="text-fixly-accent">Fixly</span>
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-fixly-text-light">
              We&rsquo;re on a mission to connect skilled professionals with people who need their
              services, creating opportunities and solving problems in communities across India.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="bg-fixly-card px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-6 text-3xl font-bold text-fixly-text md:text-4xl">Our Story</h2>
            <div className="mx-auto max-w-4xl">
              <p className="mb-6 text-lg text-fixly-text-light">
                Fixly was born from a simple observation: talented professionals were struggling to
                find work, while people desperately needed reliable services. We saw families
                waiting weeks for a plumber, skilled electricians without enough projects, and a
                disconnect that hurt both sides.
              </p>
              <p className="mb-6 text-lg text-fixly-text-light">
                Founded in 2025 by three friends who experienced these challenges firsthand, Fixly
                started as a hyperlocal solution in Coimbatore. Today, we&rsquo;re proud to serve
                over 500 cities across India, connecting thousands of skilled professionals with
                customers who need their expertise.
              </p>
              <p className="text-lg text-fixly-text-light">
                Our platform isn&rsquo;t just about transactions, it&rsquo;s about building trust,
                creating opportunities, and strengthening communities one successful job at a time.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <FoundersSection founderList={founders} />
      <ValuesSection valueList={values} />
      <ImpactSection statList={stats} />
      <ContactSection homeHref={homeHref} isAuthenticated={!!session} />

      {/* Back to Home */}
      <div className="fixed bottom-6 left-6">
        <Link
          href={homeHref}
          className="hover-lift rounded-full border border-fixly-border bg-fixly-card p-3 shadow-fixly transition-all duration-200 hover:bg-fixly-card/80"
          title={session ? 'Back to Dashboard' : 'Back to Home'}
        >
          <ArrowLeft className="h-5 w-5 text-fixly-text" />
        </Link>
      </div>
    </div>
  );
}
