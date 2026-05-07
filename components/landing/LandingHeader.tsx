'use client';

import { Menu, Wrench, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import ThemeToggle from '@/components/ui/ThemeToggle';

type LandingHeaderProps = {
  onGetStarted: () => void;
};

export default function LandingHeader({ onGetStarted }: LandingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = (): void => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-fixly-border bg-fixly-card/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Wrench className="mr-2 h-8 w-8 text-fixly-accent" aria-hidden="true" />
            <span className="text-2xl font-bold text-fixly-text">Fixly</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center space-x-6 md:flex">
            <Link
              href="/how-it-works"
              className="text-sm font-medium text-fixly-text-muted transition-colors hover:text-fixly-text"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-fixly-text-muted transition-colors hover:text-fixly-text"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-fixly-text-muted transition-colors hover:text-fixly-text"
            >
              About
            </Link>
          </nav>

          {/* Right-side actions */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Link href="/auth/signin" className="btn-ghost hidden sm:inline-flex">
              Sign In
            </Link>
            <button onClick={onGetStarted} className="btn-primary hidden sm:inline-flex">
              Get Started
            </button>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-md p-2 text-fixly-text-muted transition-colors hover:bg-fixly-border hover:text-fixly-text md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="border-t border-fixly-border bg-fixly-card md:hidden">
          <nav className="flex flex-col space-y-1 px-4 pb-4 pt-2">
            <Link
              href="/how-it-works"
              onClick={closeMobile}
              className="rounded-md px-3 py-2 text-sm font-medium text-fixly-text-muted transition-colors hover:bg-fixly-border hover:text-fixly-text"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              onClick={closeMobile}
              className="rounded-md px-3 py-2 text-sm font-medium text-fixly-text-muted transition-colors hover:bg-fixly-border hover:text-fixly-text"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              onClick={closeMobile}
              className="rounded-md px-3 py-2 text-sm font-medium text-fixly-text-muted transition-colors hover:bg-fixly-border hover:text-fixly-text"
            >
              About
            </Link>
            <div className="mt-3 flex flex-col gap-2 border-t border-fixly-border pt-3">
              <Link href="/auth/signin" onClick={closeMobile} className="btn-ghost w-full text-center">
                Sign In
              </Link>
              <button
                onClick={() => {
                  closeMobile();
                  onGetStarted();
                }}
                className="btn-primary w-full"
              >
                Get Started
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
