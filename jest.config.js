const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^jose': '<rootDir>/node_modules/jose/dist/node/cjs/index.js',
    '^ably$': '<rootDir>/node_modules/ably/build/ably-node.js',
    '^mongodb$': '<rootDir>/node_modules/mongodb/lib/index.js',
  },
  transformIgnorePatterns: [
    'node_modules[\\\\/](?!(@upstash|mongoose|mongodb|bson|ably|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|uuid|jose|openid-client|@panva)[\\\\/])',
  ],
  transform: {
    // Use babel-jest for js, jsx, ts, tsx, and mjs files
    '^.+\\.(js|jsx|ts|tsx|mjs)$': ['babel-jest', { presets: ['next/babel'] }],
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)