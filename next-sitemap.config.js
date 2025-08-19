/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXTAUTH_URL || 'https://fixly.app',
  generateRobotsTxt: true, // (optional)
  generateIndexSitemap: true,
  exclude: [
    '/auth/*',
    '/admin/*',
    '/dashboard/*',
    '/api/*',
    '/server-sitemap-index.xml',
  ],
  additionalPaths: async (config) => [
    await config.transform(config, '/'),
    await config.transform(config, '/about'),
    await config.transform(config, '/how-it-works'),
    await config.transform(config, '/pricing'),
    await config.transform(config, '/services'),
    await config.transform(config, '/safety'),
    await config.transform(config, '/help'),
    await config.transform(config, '/contact'),
    await config.transform(config, '/support'),
    await config.transform(config, '/resources'),
    await config.transform(config, '/privacy'),
    await config.transform(config, '/terms'),
    await config.transform(config, '/cookies'),
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/auth/', '/admin/', '/dashboard/', '/api/'],
      },
    ],
    additionalSitemaps: [
      `${process.env.NEXTAUTH_URL || 'https://fixly.app'}/server-sitemap-index.xml`,
    ],
  },
  transform: async (config, path) => {
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    }
  },
  changefreq: 'daily',
  priority: 0.7,
  autoLastmod: true,
}