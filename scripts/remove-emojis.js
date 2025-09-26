#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define emoji replacements for professional logging
const emojiReplacements = {
  '🔧': '[Config]',
  '✅': '[Success]',
  '❌': '[Error]',
  '🚀': '[Ready]',
  '📊': '[Analytics]',
  '👁️': '[View]',
  '📝': '[Application]',
  '💥': '[Error]',
  '⚠️': '[Warning]',
  '🔴': '[Error]',
  '🔌': '[Connection]',
  '🎯': '[Task]',
  '🔥': '[Hot]',
  '⚡': '[Fast]',
  '📱': '[Mobile]',
  '💻': '[Desktop]',
  '🌟': '[Featured]',
  '💡': '[Info]',
  '🎨': '[Style]',
  '🛡️': '[Security]'
};

// Files to update (excluding node_modules and .next)
const filesToUpdate = [
  'lib/redis.js',
  'app/api/admin/dashboard/route.js',
  'app/api/jobs/[jobId]/apply/route.js',
  'app/api/jobs/[jobId]/view/route.js',
  'utils/validation.js',
  'utils/toast.js',
  'utils/rateLimiting.js',
  'components/search/EnhancedAdvancedSearch.js'
];

function removeEmojisFromFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let updated = false;

  // Replace each emoji with professional alternative
  for (const [emoji, replacement] of Object.entries(emojiReplacements)) {
    const regex = new RegExp(emoji, 'g');
    if (content.includes(emoji)) {
      content = content.replace(regex, replacement);
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(fullPath, content);
    console.log(`[Success] Updated: ${filePath}`);
  } else {
    console.log(`[Info] No changes needed: ${filePath}`);
  }
}

console.log('[Task] Removing unprofessional emojis from codebase...\n');

filesToUpdate.forEach(removeEmojisFromFile);

console.log('\n[Success] Emoji cleanup completed!');
console.log('[Info] All console logs now use professional formatting');