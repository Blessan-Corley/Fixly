#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files that need to be updated
const filesToUpdate = [
  'app/api/admin/users/route.js',
  'app/api/jobs/[jobId]/apply/route.js',
  'app/api/jobs/[jobId]/view/route.js',
  'app/api/user/notifications/read/route.js',
  'app/api/user/notifications/route.js',
  'components/admin/AdminDashboard.js',
  'components/search/AdvancedSearch.js',
  'components/search/EnhancedAdvancedSearch.js'
];

function fixRedisImports(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let updated = false;

  // Fix imports
  if (content.includes("from '../../../lib/cache'")) {
    content = content.replace("from '../../../lib/cache'", "from '../../../lib/redis'");
    updated = true;
  }

  if (content.includes("from '../../lib/cache'")) {
    content = content.replace("from '../../lib/cache'", "from '../../lib/redis'");
    updated = true;
  }

  if (content.includes("from '../../../../lib/cache'")) {
    content = content.replace("from '../../../../lib/cache'", "from '../../../../lib/redis'");
    updated = true;
  }

  // Fix destructured imports
  if (content.includes('{ cache, analytics }')) {
    content = content.replace('{ cache, analytics }', '{ redisUtils }');
    updated = true;
  }

  if (content.includes('{ cache }')) {
    content = content.replace('{ cache }', '{ redisUtils }');
    updated = true;
  }

  if (content.includes('{ redisRateLimit, cache }')) {
    content = content.replace('{ redisRateLimit, cache }', '{ redisRateLimit, redisUtils }');
    updated = true;
  }

  // Fix usage
  content = content.replace(/cache\.get\(/g, 'redisUtils.get(');
  content = content.replace(/cache\.set\(/g, 'redisUtils.set(');
  content = content.replace(/cache\.del\(/g, 'redisUtils.del(');
  content = content.replace(/cache\.exists\(/g, 'redisUtils.exists(');

  // Remove analytics usage
  content = content.replace(/await analytics\.trackEvent\([^;]+\);?/g, '// Analytics removed');

  if (updated || content.includes('redisUtils')) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed: ${filePath}`);
  } else {
    console.log(`⚠️ No changes needed: ${filePath}`);
  }
}

console.log('🔧 Fixing Redis imports and usage...\n');

filesToUpdate.forEach(fixRedisImports);

console.log('\n✅ Redis import fixes completed!');