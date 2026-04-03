import type { Metadata } from 'next';

import LandingPageClient from '@/components/landing/LandingPageClient';

export const metadata: Metadata = {
  title: 'Fixly — Hire Local Service Professionals',
  description:
    'Connect with verified local fixers for plumbing, electrical, cleaning, and more. Post a job in minutes and get quotes from qualified professionals in your area.',
  openGraph: {
    title: 'Fixly — Hire Local Service Professionals',
    description:
      'Connect with verified local fixers for plumbing, electrical, cleaning, and more.',
    type: 'website',
    url: '/',
    siteName: 'Fixly',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Fixly — Hire Local Service Professionals',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fixly — Hire Local Service Professionals',
    description:
      'Connect with verified local fixers for plumbing, electrical, cleaning, and more.',
    images: ['/og-image.png'],
  },
};

export default function HomePage() {
  return <LandingPageClient />;
}
