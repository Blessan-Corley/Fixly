import type { Metadata, Viewport } from 'next';
import { Manrope, PT_Mono } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';

import StructuredData from '../components/seo/StructuredData';
import { env } from '../lib/env';
import { getSiteUrlObject } from '../lib/siteUrl';

import { Providers } from './providers';
import './globals.css';

const getMetadataBase = (): URL => {
  return getSiteUrlObject();
};

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  display: 'fallback',
  variable: '--font-manrope',
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Arial',
    'sans-serif',
  ],
  adjustFontFallback: false,
  preload: true,
});

const ptMono = PT_Mono({
  subsets: ['latin'],
  weight: ['400'],
  display: 'fallback',
  variable: '--font-pt-mono',
  fallback: ['Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', 'monospace'],
  adjustFontFallback: false,
  preload: false,
});

export const metadata: Metadata = {
  title: 'Fixly - Hyperlocal Service Marketplace',
  description:
    'Find trusted local service professionals for all your home and business needs. From plumbing to electrical work, connect with skilled fixers in your area.',
  keywords: [
    'local services',
    'home repair',
    'skilled workers',
    'plumber',
    'electrician',
    'handyman',
    'hyperlocal',
    'marketplace',
  ],
  authors: [{ name: 'Blessan Corley A' }],
  creator: 'Blessan Corley A',
  publisher: 'Fixly',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: getMetadataBase(),
  openGraph: {
    title: 'Fixly - Hyperlocal Service Marketplace',
    description: 'Find trusted local service professionals for all your home and business needs.',
    url: '/',
    siteName: 'Fixly',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Fixly - Hyperlocal Service Marketplace',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fixly - Hyperlocal Service Marketplace',
    description: 'Find trusted local service professionals for all your home and business needs.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: env.GOOGLE_SITE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0d9488' },
    { media: '(prefers-color-scheme: dark)', color: '#14b8a6' },
  ],
  colorScheme: 'light dark',
  viewportFit: 'cover',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${manrope.variable} ${ptMono.variable}`}>
      <body className="font-manrope antialiased">
        <NuqsAdapter>
          <Providers>
            <StructuredData type="organization" />
            <StructuredData type="website" />
            {children}
          </Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
