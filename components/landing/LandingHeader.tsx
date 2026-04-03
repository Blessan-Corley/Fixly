'use client';

import { Wrench } from 'lucide-react';
import Link from 'next/link';

import ThemeToggle from '@/components/ui/ThemeToggle';

type LandingHeaderProps = {
  onGetStarted: () => void;
};

export default function LandingHeader({ onGetStarted }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-fixly-border bg-fixly-card/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center">
            <Wrench className="mr-2 h-8 w-8 text-fixly-accent" />
            <span className="text-2xl font-bold text-fixly-text">Fixly</span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/auth/signin" className="btn-ghost">
              Sign In
            </Link>
            <button onClick={onGetStarted} className="btn-primary">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
