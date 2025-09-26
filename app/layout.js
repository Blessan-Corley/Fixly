// app/layout.js
import { Manrope, PT_Mono } from 'next/font/google';
import { Providers } from './providers';
import CookieConsent from '../components/CookieConsent';
import PWAInstallPrompt from '../components/ui/PWAInstallPrompt';
import StructuredData from '../components/seo/StructuredData';
import './globals.css';

// Enhanced font configuration with better fallbacks and error handling
const manrope = Manrope({ 
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  display: 'fallback', // Changed from 'swap' to 'fallback' for better performance
  variable: '--font-manrope',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
  adjustFontFallback: false, // Disable to prevent layout shifts
  preload: true
});

const ptMono = PT_Mono({ 
  subsets: ['latin'],
  weight: ['400'],
  display: 'fallback',
  variable: '--font-pt-mono',
  fallback: ['Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', 'monospace'],
  adjustFontFallback: false,
  preload: false // PT_Mono is less critical, don't preload
});

export const metadata = {
  title: 'Fixly - Hyperlocal Service Marketplace',
  description: 'Find trusted local service professionals for all your home and business needs. From plumbing to electrical work, connect with skilled fixers in your area.',
  keywords: ['local services', 'home repair', 'skilled workers', 'plumber', 'electrician', 'handyman', 'hyperlocal', 'marketplace'],
  authors: [{ name: 'Blessan Corley A' }],
  creator: 'Blessan Corley A',
  publisher: 'Fixly',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
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
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    shortcut: '/favicon.svg'
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0d9488' },
    { media: '(prefers-color-scheme: dark)', color: '#14b8a6' }
  ],
  colorScheme: 'light dark',
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} ${ptMono.variable}`}>
      <body className="font-manrope antialiased">
        <Providers>
          <StructuredData type="organization" />
          <StructuredData type="website" />
          {children}
          <PWAInstallPrompt />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}