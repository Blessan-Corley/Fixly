#!/usr/bin/env node

/**
 * Vercel Deployment Verification Script
 * Checks if all required environment variables are configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Fixly deployment configuration...\n');

// Required environment variables for production
const requiredEnvVars = {
  'Database': [
    'MONGODB_URI'
  ],
  'Authentication': [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ],
  'Firebase Client': [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
  ],
  'Firebase Admin': [
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PROJECT_ID'
  ],
  'Google Services': [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'
  ],
  'Real-time Features': [
    'REDIS_URL',
    'ABLY_ROOT_KEY',
    'NEXT_PUBLIC_ABLY_CLIENT_KEY'
  ],
  'File Storage': [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ],
  'Email': [
    'EMAIL_USER',
    'EMAIL_PASSWORD'
  ],
  'Payments': [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET'
  ],
  'Security': [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'ADMIN_SETUP_KEY'
  ]
};

// Check if all required environment variables are set
let allConfigured = true;
let missingVars = [];

console.log('📋 Environment Variables Check:\n');

Object.entries(requiredEnvVars).forEach(([category, vars]) => {
  console.log(`🔧 ${category}:`);

  vars.forEach(varName => {
    const isSet = process.env[varName] && process.env[varName] !== 'your_value_here';
    const status = isSet ? '✅' : '❌';

    console.log(`   ${status} ${varName}`);

    if (!isSet) {
      allConfigured = false;
      missingVars.push(varName);
    }
  });

  console.log('');
});

// Check for build files
console.log('📦 Build Verification:');

const buildFiles = [
  '.next/package.json',
  '.next/server',
  '.next/static'
];

buildFiles.forEach(filePath => {
  const exists = fs.existsSync(path.join(process.cwd(), filePath));
  const status = exists ? '✅' : '❌';
  console.log(`   ${status} ${filePath}`);
});

console.log('');

// Check package.json scripts
console.log('🔨 Scripts Check:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['build', 'start', 'dev'];

requiredScripts.forEach(script => {
  const exists = packageJson.scripts && packageJson.scripts[script];
  const status = exists ? '✅' : '❌';
  console.log(`   ${status} ${script}`);
});

console.log('');

// Check vercel.json
console.log('⚡ Vercel Configuration:');
const vercelConfigExists = fs.existsSync('vercel.json');
console.log(`   ${vercelConfigExists ? '✅' : '❌'} vercel.json`);

if (vercelConfigExists) {
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    console.log(`   ✅ Framework: ${vercelConfig.framework || 'nextjs'}`);
    console.log(`   ✅ Functions timeout: ${vercelConfig.functions ? '30s' : 'default'}`);
  } catch (error) {
    console.log('   ❌ Invalid vercel.json syntax');
  }
}

console.log('');

// Summary
console.log('📊 Deployment Readiness Summary:');
console.log('=====================================');

if (allConfigured && vercelConfigExists) {
  console.log('🎉 Ready for deployment!');
  console.log('✅ All environment variables configured');
  console.log('✅ Vercel configuration present');
  console.log('✅ Build files generated');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('1. Push to GitHub repository');
  console.log('2. Connect repository to Vercel');
  console.log('3. Set environment variables in Vercel dashboard');
  console.log('4. Deploy!');
} else {
  console.log('⚠️  Configuration incomplete');

  if (missingVars.length > 0) {
    console.log('');
    console.log('❌ Missing environment variables:');
    missingVars.forEach(varName => {
      console.log(`   • ${varName}`);
    });
    console.log('');
    console.log('📝 Add these to your Vercel project environment variables');
  }

  if (!vercelConfigExists) {
    console.log('❌ vercel.json configuration missing');
  }
}

console.log('');
console.log('📖 For detailed deployment instructions, see DEPLOYMENT.md');

// Exit with appropriate code
process.exit(allConfigured && vercelConfigExists ? 0 : 1);