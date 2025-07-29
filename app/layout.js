// app/layout.js
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata = {
  title: 'Fixly - Hyperlocal Service Marketplace',
  description: 'Find trusted local service professionals for all your home and business needs. From plumbing to electrical work, connect with skilled fixers in your area.',
  keywords: ['local services', 'home repair', 'skilled workers', 'plumber', 'electrician', 'handyman', 'hyperlocal', 'marketplace'],
  authors: [{ name: 'Fixly Team' }],
  creator: 'Fixly',
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
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#DCF763',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}