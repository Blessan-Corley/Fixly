// app/about/layout.js - Metadata for About page
export const metadata = {
  title: 'About Fixly - Hyperlocal Service Marketplace',
  description: 'Learn about Fixly\'s mission to connect homeowners with trusted local service professionals. Discover our story, values, and commitment to quality service.',
  keywords: ['about fixly', 'hyperlocal marketplace', 'service professionals', 'local services', 'company story', 'mission', 'values'],
  openGraph: {
    title: 'About Fixly - Hyperlocal Service Marketplace',
    description: 'Learn about Fixly\'s mission to connect homeowners with trusted local service professionals.',
    url: '/about',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Fixly - Hyperlocal Service Marketplace',
    description: 'Learn about Fixly\'s mission to connect homeowners with trusted local service professionals.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutLayout({ children }) {
  return children;
}