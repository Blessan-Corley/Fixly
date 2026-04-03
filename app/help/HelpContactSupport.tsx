'use client';

import { Mail, MessageCircle, Phone } from 'lucide-react';

export default function HelpContactSupport() {
  return (
    <div className="rounded-lg bg-fixly-primary-bg p-8 text-center">
      <h3 className="mb-4 text-xl font-bold text-fixly-text">Still need help?</h3>
      <p className="mb-6 text-fixly-text-light">
        Can&apos;t find what you&apos;re looking for? Our support team is here to help.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <a
          href="https://wa.me/919976768211?text=Hi! I need help with Fixly."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-lg border border-fixly-border bg-fixly-card px-6 py-3 text-fixly-text transition-shadow hover:text-fixly-accent hover:shadow-md"
        >
          <MessageCircle className="mr-2 h-5 w-5 text-fixly-accent" />
          WhatsApp Chat
        </a>
        <a
          href="mailto:blessancorley@gmail.com?subject=Help Request - Fixly&body=Hi, I need help with:"
          className="flex items-center justify-center rounded-lg border border-fixly-border bg-fixly-card px-6 py-3 text-fixly-text transition-shadow hover:text-fixly-accent hover:shadow-md"
        >
          <Mail className="mr-2 h-5 w-5 text-fixly-accent" />
          Email Support
        </a>
        <a
          href="tel:+919976768211"
          className="flex items-center justify-center rounded-lg border border-fixly-border bg-fixly-card px-6 py-3 text-fixly-text transition-shadow hover:text-fixly-accent hover:shadow-md"
        >
          <Phone className="mr-2 h-5 w-5 text-fixly-accent" />
          Call Us
        </a>
      </div>
    </div>
  );
}
