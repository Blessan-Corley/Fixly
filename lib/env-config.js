const envConfig = {
  isAnalyze: process.env.ANALYZE === 'true',
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
};

module.exports = envConfig;
