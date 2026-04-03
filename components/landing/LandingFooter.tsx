'use client';

import { Facebook, Instagram, Mail, MessageCircle, Twitter, Wrench } from 'lucide-react';
import Link from 'next/link';

type LandingFooterProps = {
  onPostJob: () => void;
  onBecomeFixer: () => void;
};

export default function LandingFooter({ onPostJob, onBecomeFixer }: LandingFooterProps) {
  return (
    <footer className="bg-fixly-text py-12 text-fixly-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center">
              <Wrench className="mr-2 h-6 w-6 text-fixly-accent" />
              <span className="text-xl font-bold">Fixly</span>
            </div>
            <p className="mb-4 text-fixly-bg/80">Your trusted local service marketplace</p>

            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/fixly"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fixly-bg/60 transition-colors duration-200 hover:text-fixly-accent"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/fixly"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fixly-bg/60 transition-colors duration-200 hover:text-fixly-accent"
                aria-label="Twitter/X"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/fixly"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fixly-bg/60 transition-colors duration-200 hover:text-fixly-accent"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://wa.me/919976768211?text=Hi! I'm interested in Fixly services."
                target="_blank"
                rel="noopener noreferrer"
                className="text-fixly-bg/60 transition-colors duration-200 hover:text-fixly-accent"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
              <a
                href="mailto:blessancorley@gmail.com"
                className="text-fixly-bg/60 transition-colors duration-200 hover:text-fixly-accent"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">For Customers</h3>
            <ul className="space-y-2 text-fixly-bg/80">
              <li>
                <button
                  onClick={onPostJob}
                  className="transition-colors hover:text-fixly-accent"
                >
                  Post a Job
                </button>
              </li>
              <li>
                <Link href="/services" className="transition-colors hover:text-fixly-accent">
                  Find Services
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="transition-colors hover:text-fixly-accent">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/safety" className="transition-colors hover:text-fixly-accent">
                  Safety
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">For Fixers</h3>
            <ul className="space-y-2 text-fixly-bg/80">
              <li>
                <button
                  onClick={onBecomeFixer}
                  className="transition-colors hover:text-fixly-accent"
                >
                  Become a Fixer
                </button>
              </li>
              <li>
                <Link href="/pricing" className="transition-colors hover:text-fixly-accent">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/resources" className="transition-colors hover:text-fixly-accent">
                  Resources
                </Link>
              </li>
              <li>
                <Link href="/support" className="transition-colors hover:text-fixly-accent">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Company</h3>
            <ul className="space-y-2 text-fixly-bg/80">
              <li>
                <Link href="/about" className="transition-colors hover:text-fixly-accent">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition-colors hover:text-fixly-accent">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-fixly-accent">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-fixly-accent">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-fixly-bg/20 pt-8">
          <div className="text-center text-fixly-bg/60">
            <p>
              &copy; 2025 Fixly. All rights reserved. |
              <Link
                href="/cookies"
                className="ml-1 underline transition-colors hover:text-fixly-accent"
              >
                Cookies
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
