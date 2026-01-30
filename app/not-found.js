// app/not-found.js
'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft, Wrench } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-fixly-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <Wrench className="h-12 w-12 text-fixly-accent mr-3" />
            <span className="text-3xl font-bold text-fixly-text">Fixly</span>
          </div>

          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="text-8xl font-bold text-fixly-accent opacity-50 mb-4">404</div>
            <div className="relative">
              <div className="w-32 h-32 bg-fixly-card rounded-full mx-auto flex items-center justify-center">
                <Search className="h-16 w-16 text-fixly-text-muted" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">×</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-fixly-text mb-4">
            Page Not Found
          </h1>
          <p className="text-fixly-text-light mb-8">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. 
            It might have been moved, deleted, or doesn&apos;t exist.
          </p>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => router.push('/')}
              className="btn-primary w-full flex items-center justify-center"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </button>
            
            <button
              onClick={() => router.back()}
              className="btn-secondary w-full flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
          </div>

          {/* Helpful Links */}
          <div className="mt-8 pt-6 border-t border-fixly-border">
            <p className="text-sm text-fixly-text-muted mb-4">
              Looking for something specific?
            </p>
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
                Help & Support
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}