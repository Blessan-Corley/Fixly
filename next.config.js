// Phase 2: Disabled runtime SVG rendering for user-controlled uploads.
const { withSentryConfig } = require('@sentry/nextjs');
const envConfig = require('./lib/env-config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    // Suppress noisy dynamic import warnings from keyv (pulled in by Ably).
    // We use ignoreWarnings instead of ContextReplacementPlugin with a callback
    // because callback functions cannot be serialised for webpack build workers
    // (DataCloneError) in Next.js 15.
    config.module.exprContextCritical = false;
    config.module.unknownContextCritical = false;
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /keyv/ },
      /Critical dependency: the request of a dynamic expression is ambiguous/,
    ];

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        assert: false,
        child_process: false,
        crypto: false,
        dns: false,
        fs: false,
        http: false,
        https: false,
        net: false,
        os: false,
        path: false,
        stream: false,
        tls: false,
        url: false,
        zlib: false,
      };

      // Alias node: URI scheme imports to empty modules for client bundles.
      // Any server-only module using `import ... from 'node:*'` that leaks into
      // the client-side graph (e.g. via a missing 'use server' / dynamic import)
      // gets a harmless no-op rather than a webpack UnhandledSchemeError.
      config.resolve.alias = {
        ...config.resolve.alias,
        undici: false,
        'node:crypto': false,
        'node:buffer': false,
        'node:events': false,
        'node:path': false,
        'node:stream': false,
        'node:util': false,
        'node:url': false,
        'node:net': false,
        'node:tls': false,
        'node:dns': false,
        'node:os': false,
        'node:fs': false,
        'node:http': false,
        'node:https': false,
        'node:zlib': false,
        'node:assert': false,
        'node:child_process': false,
      };
    }

    if (!dev && envConfig.isAnalyze) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
          statsFilename: isServer ? '../analyze/server-stats.json' : './analyze/client-stats.json',
          generateStatsFile: true,
        })
      );
    }

    return config;
  },

  transpilePackages: [
    'firebase',
    '@firebase/auth',
    '@firebase/firestore',
    'ably',
    'keyv',
    '@keyv/redis',
  ],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.cloud.google.com',
        pathname: '/**',
      },
    ],
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          {
            key: 'Access-Control-Allow-Origin',
            value: envConfig.nextAuthUrl,
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  compress: true,
  poweredByHeader: false,
};

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
