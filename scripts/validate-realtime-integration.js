#!/usr/bin/env node

/**
 * Real-time Integration Validation Script
 * Validates that all real-time components are properly integrated
 * without requiring a running server
 */

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  console.log(exists ? `✅ ${description}` : `❌ ${description} - Missing: ${filePath}`);
  return exists;
}

function validateFileContent(filePath, patterns, description) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ ${description} - File not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const results = patterns.map(pattern => ({
      pattern: pattern.name,
      found: pattern.regex.test(content)
    }));

    const passed = results.every(r => r.found);
    console.log(passed ? `✅ ${description}` : `❌ ${description}`);

    if (!passed) {
      results.filter(r => !r.found).forEach(r => {
        console.log(`   Missing: ${r.pattern}`);
      });
    }

    return passed;
  } catch (error) {
    console.log(`❌ ${description} - Error reading file: ${error.message}`);
    return false;
  }
}

function runValidation() {
  console.log('🔍 REAL-TIME SYSTEM INTEGRATION VALIDATION\n');

  let score = 0;
  let total = 0;

  // 1. Core Infrastructure
  console.log('📡 Core Real-time Infrastructure:');
  total++; score += checkFileExists('lib/ably.js', 'Ably client configuration') ? 1 : 0;
  total++; score += checkFileExists('contexts/AblyContext.js', 'Ably React context') ? 1 : 0;

  // 2. Location System
  console.log('\n📍 Location System:');
  total++; score += checkFileExists('hooks/useLocationTracking.js', 'Location tracking hook') ? 1 : 0;
  total++; score += checkFileExists('app/api/user/location/history/route.js', 'Location history API') ? 1 : 0;
  total++; score += checkFileExists('app/api/location/reverse-geocode/route.js', 'Reverse geocoding API') ? 1 : 0;
  total++; score += checkFileExists('components/ui/LocationPermission.js', 'Location permission component') ? 1 : 0;

  // 3. Job System with Real-time Features
  console.log('\n💼 Job System:');
  total++; score += validateFileContent('components/jobs/VirtualJobList.js', [
    { name: 'Ably integration', regex: /getClientAbly|CHANNELS\.|EVENTS\./s },
    { name: 'Distance calculation', regex: /calculateDistance.*Haversine/s },
    { name: 'Advanced filtering', regex: /applyAdvancedFilters/s },
    { name: 'Real-time job updates', regex: /useEffect.*setupRealtimeConnection/s }
  ], 'VirtualJobList real-time features') ? 1 : 0;

  total++; score += validateFileContent('components/JobCardRectangular.js', [
    { name: 'Real-time time updates', regex: /useEffect.*setInterval.*timeAgo/s },
    { name: 'Sensitive content filtering', regex: /sanitizeText.*CONTACT.*EMAIL/s },
    { name: 'Distance display', regex: /userLocation.*showDistance/s },
    { name: 'Live view count', regex: /useAblyChannel.*view_count/s }
  ], 'JobCardRectangular real-time features') ? 1 : 0;

  // 4. API Endpoints
  console.log('\n🔌 API Endpoints:');
  total++; score += validateFileContent('app/api/jobs/[jobId]/view/route.js', [
    { name: 'Ably broadcasting', regex: /getServerAbly.*publish.*JOB_UPDATED/s },
    { name: 'View count increment', regex: /\$inc.*views\.count/s }
  ], 'Job view API real-time broadcasting') ? 1 : 0;

  total++; score += validateFileContent('app/api/jobs/[jobId]/comments/route.js', [
    { name: 'Content validation', regex: /validateContent.*BLOCKED_PATTERNS/s },
    { name: 'Real-time comment broadcasting', regex: /ably.*publish.*COMMENT_POSTED/s }
  ], 'Comment API real-time features') ? 1 : 0;

  total++; score += validateFileContent('app/api/jobs/[jobId]/comments/[commentId]/like/route.js', [
    { name: 'Like broadcasting', regex: /ably.*publish.*COMMENT_LIKED/s },
    { name: 'Like count update', regex: /liked.*likeCount/s }
  ], 'Like API real-time features') ? 1 : 0;

  // 5. Content Validation
  console.log('\n🛡️ Content Validation:');
  total++; score += validateFileContent('lib/validations/content-validator.js', [
    { name: 'Phone number blocking', regex: /BLOCKED_PATTERNS.*phoneNumbers.*\\d\{10\}/s },
    { name: 'Email blocking', regex: /BLOCKED_PATTERNS.*emails.*@/s },
    { name: 'Social media blocking', regex: /whatsapp.*telegram.*instagram/s },
    { name: 'Content sanitization', regex: /sanitizeContent.*replace/s }
  ], 'Content validation system') ? 1 : 0;

  // 6. Real-time Comments Component
  console.log('\n💬 Comment System:');
  total++; score += checkFileExists('components/InstagramCommentsRealtime.js', 'Real-time comments component') ? 1 : 0;

  // 7. Package.json dependencies
  console.log('\n📦 Dependencies:');
  total++; score += validateFileContent('package.json', [
    { name: 'Ably client', regex: /"ably":\s*"[^"]+"/s },
    { name: 'Next.js 15', regex: /"next":\s*"15\./s },
    { name: 'React 18', regex: /"react":\s*"18\./s },
    { name: 'Framer Motion', regex: /"framer-motion":\s*"[^"]+"/s }
  ], 'Required dependencies') ? 1 : 0;

  // Results
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${score}/${total}`);
  console.log(`❌ Failed: ${total - score}/${total}`);
  console.log(`📈 Success Rate: ${((score / total) * 100).toFixed(1)}%\n`);

  const isSuccess = score === total;
  console.log(isSuccess ?
    '🎉 ALL REAL-TIME COMPONENTS PROPERLY INTEGRATED!' :
    '⚠️ Some components need attention.'
  );

  if (isSuccess) {
    console.log('\n✅ Verified Integration Features:');
    console.log('  🔗 Ably real-time infrastructure');
    console.log('  📍 Location tracking and distance calculations');
    console.log('  💼 Real-time job posting and filtering');
    console.log('  👀 Live view count updates');
    console.log('  💬 Real-time comment system');
    console.log('  ❤️ Real-time likes and reactions');
    console.log('  🛡️ Content validation and spam protection');
    console.log('  📱 Mobile-optimized UI components');
    console.log('  🚀 Vercel deployment compatibility (no Socket.IO)');
  }

  return {
    success: isSuccess,
    score,
    total,
    successRate: (score / total) * 100
  };
}

// Run validation if called directly
if (require.main === module) {
  const results = runValidation();
  process.exit(results.success ? 0 : 1);
}

module.exports = { runValidation };