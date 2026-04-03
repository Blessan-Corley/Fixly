'use client';

import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-fixly-bg p-4">
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-8 flex items-center justify-center">
            <Wrench className="mr-3 h-12 w-12 text-fixly-accent" />
            <span className="text-3xl font-bold text-fixly-text">Fixly</span>
          </div>

          <div className="mb-8">
            <div className="mb-4 text-8xl font-bold text-fixly-accent opacity-50">404</div>
            <div className="relative">
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-fixly-card">
                <Search className="h-16 w-16 text-fixly-text-muted" />
              </div>
              <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500">
                <span className="text-lg font-bold text-white">x</span>
              </div>
            </div>
          </div>

          <h1 className="mb-4 text-2xl font-bold text-fixly-text">Page Not Found</h1>
          <p className="mb-8 text-fixly-text-light">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved,
            deleted, or doesn&apos;t exist.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/')}
              className="btn-primary flex w-full items-center justify-center"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </button>

            <button
              onClick={() => router.back()}
              className="btn-secondary flex w-full items-center justify-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </button>
          </div>

          <div className="mt-8 border-t border-fixly-border pt-6">
            <p className="mb-4 text-sm text-fixly-text-muted">Looking for something specific?</p>
            <div className="flex flex-col space-y-2 text-sm">
              <button
                onClick={() => router.push('/auth/signin')}
                className="text-fixly-accent hover:text-fixly-accent-dark"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/auth/signup')}
                className="text-fixly-accent hover:text-fixly-accent-dark"
              >
                Create Account
              </button>
              <button
                onClick={() => router.push('/about')}
                className="text-fixly-accent hover:text-fixly-accent-dark"
              >
                About Fixly
              </button>
              <button
                onClick={() => router.push('/help')}
                className="text-fixly-accent hover:text-fixly-accent-dark"
              >
                Help and Support
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
