// Create: next.config.js - ADD this to ensure env vars load properly
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
    webpackBuildWorker: true,
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'framer-motion', '@tanstack/react-query'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    }
  },
  
  // ⚠️ SECURITY: Only expose PUBLIC variables here
  // NEVER expose secrets like NEXTAUTH_SECRET, GOOGLE_CLIENT_SECRET, etc.
  env: {
    // Only NEXT_PUBLIC_ variables should be exposed to client
    // Next.js handles this automatically for variables starting with NEXT_PUBLIC_
    // So we don't need to manually list them here unless we're aliasing them
  },
  
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Suppress critical dependency warnings from keyv (used by Ably)
    config.module.exprContextCritical = false;
    config.module.unknownContextCritical = false;

    // Add plugin to handle dynamic imports better
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /keyv/,
        (data) => {
          // Suppress warnings from keyv module
          data.dependencies.forEach((dep) => {
            if (dep.critical) dep.critical = false;
          });
          return data;
        }
      )
    );

    // Client-side optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };

      config.resolve.alias = {
        ...config.resolve.alias,
        'undici': false,
      };

      config.externals = config.externals || [];
      config.externals.push({
        'undici': 'undici',
        'firebase-admin': 'firebase-admin'
      });

      // Bundle splitting and optimization
      if (!dev) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              // Vendor chunk for stable dependencies
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                priority: 10,
                reuseExistingChunk: true,
              },
              // React ecosystem chunk
              react: {
                test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
                name: 'react',
                priority: 20,
                reuseExistingChunk: true,
              },
              // UI libraries chunk
              ui: {
                test: /[\\/]node_modules[\\/](framer-motion|lucide-react)[\\/]/,
                name: 'ui',
                priority: 15,
                reuseExistingChunk: true,
              },
              // Query and state management
              query: {
                test: /[\\/]node_modules[\\/](@tanstack\/react-query|socket\.io-client)[\\/]/,
                name: 'query',
                priority: 15,
                reuseExistingChunk: true,
              },
              // Common chunk for frequently used modules
              common: {
                name: 'common',
                minChunks: 2,
                priority: 5,
                reuseExistingChunk: true,
              },
            },
          },
        };
      }
    }

    // Production optimizations
    if (!dev) {
      // Analyze bundle size in development
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'server',
            openAnalyzer: true,
          })
        );
      }

      // Compression and minification
      config.optimization.minimize = true;
      
      // Remove console logs in production (safely check if minimizer exists)
      if (config.optimization.minimizer && 
          config.optimization.minimizer[0] && 
          config.optimization.minimizer[0].options && 
          config.optimization.minimizer[0].options.terserOptions) {
        config.optimization.minimizer[0].options.terserOptions.compress.drop_console = true;
      }
    }

    // Performance monitoring
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.BUILD_ID': JSON.stringify(buildId),
        'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
      })
    );

    return config;
  },
  
  transpilePackages: [
    'firebase',
    '@firebase/auth',
    '@firebase/firestore',
    'ably',
    'keyv',
    '@keyv/redis'
  ],
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXTAUTH_URL || 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ]
      }
    ];
  },
  
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: true, // Temporarily disabled to focus on functionality
  },
  
  // Production optimizations
  swcMinify: true,
  compress: true,
  
  // Performance improvements
  poweredByHeader: false,
  
};

module.exports = nextConfig;