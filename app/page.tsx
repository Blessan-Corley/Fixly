import type { Metadata } from 'next';

import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingPageClient from '@/components/landing/LandingPageClient';
import LandingStats from '@/components/landing/LandingStats';
import LandingTestimonials from '@/components/landing/LandingTestimonials';
import { getSiteUrl } from '@/lib/siteUrl';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: 'Fixly — Hire Local Service Professionals',
  description:
    'Connect with verified local fixers for plumbing, electrical, cleaning, and more. Post a job in minutes and get quotes from qualified professionals in your area.',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'Fixly — Hire Local Service Professionals',
    description:
      'Connect with verified local fixers for plumbing, electrical, cleaning, and more.',
    type: 'website',
    url: siteUrl,
    siteName: 'Fixly',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
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
    images: [`${siteUrl}/og-image.png`],
  },
};

export default function HomePage() {
  return (
    <LandingPageClient>
      <LandingStats />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingTestimonials />
    </LandingPageClient>
  );
}
