// app/robots.js - Dynamic robots.txt generation
export default function robots() {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://fixly.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/auth/',
        '/admin/',
        '/dashboard/',
        '/api/',
        '/_next/',
        '/test/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}