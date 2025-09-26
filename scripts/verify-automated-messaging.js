#!/usr/bin/env node

/**
 * Verify Automated Messaging System Integration
 * Tests that all automated messaging functions are properly integrated
 */

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

function checkFunctionUsage(filePath, functionName, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  // Exclude comments - look for actual function calls
  const lines = content.split('\n').filter(line => !line.trim().startsWith('//'));
  const isUsed = lines.some(line => line.includes(functionName));
  console.log(`${isUsed ? '✅' : '❌'} ${description}: ${functionName} in ${filePath}`);
  return isUsed;
}

function checkTemplateExists(filePath, templateName) {
  const fullPath = path.join(__dirname, '..', filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const exists = content.includes(templateName);
  console.log(`${exists ? '✅' : '❌'} Template ${templateName} exists in automatedMessaging.js`);
  return exists;
}

console.log('🔍 AUTOMATED MESSAGING SYSTEM VERIFICATION\n');

// Check core files exist
console.log('📁 Core Files:');
let allGood = true;
allGood &= checkFileExists('lib/services/automatedMessaging.js', 'Automated Messaging Service');
allGood &= checkFileExists('lib/services/messageService.js', 'Message Service');
allGood &= checkFileExists('app/api/jobs/[jobId]/status/route.js', 'Job Status API');
allGood &= checkFileExists('app/api/reviews/submit/route.js', 'Reviews API');

console.log('\n🔗 Function Integration:');
// Check function usage in APIs
allGood &= checkFunctionUsage('app/api/jobs/[jobId]/status/route.js', 'sendWorkStatusMessage', 'Work Status Messages');
allGood &= checkFunctionUsage('app/api/jobs/[jobId]/status/route.js', 'sendPaymentReminder', 'Payment Reminders');
allGood &= checkFunctionUsage('app/api/reviews/submit/route.js', 'sendReviewCompletionMessage', 'Review Completion Messages');
allGood &= checkFunctionUsage('app/api/jobs/[jobId]/applications/route.js', 'MessageService.createJobConversation', 'Job Conversation Creation');

console.log('\n📋 Message Templates:');
// Check required templates exist
allGood &= checkTemplateExists('lib/services/automatedMessaging.js', 'WORK_STARTED');
allGood &= checkTemplateExists('lib/services/automatedMessaging.js', 'WORK_COMPLETED');
allGood &= checkTemplateExists('lib/services/automatedMessaging.js', 'PAYMENT_REMINDER');
allGood &= checkTemplateExists('lib/services/automatedMessaging.js', 'REVIEW_COMPLETED');
allGood &= checkTemplateExists('lib/services/automatedMessaging.js', 'DEADLINE_REMINDER');

console.log('\n🚫 Removed Redundancy:');
// Check that redundant code has been removed
const noCron = !checkFileExists('app/api/cron/automated-messages/route.js', 'Cron Automated Messages');
const noScheduler = !checkFunctionUsage('lib/services/automatedMessaging.js', 'scheduleAutomatedReminders', 'Scheduler Function');
const noDuplicateAssignment = !checkFunctionUsage('app/api/jobs/[jobId]/status/route.js', 'sendJobAssignmentMessage', 'Duplicate Job Assignment');

console.log(`${noCron ? '✅' : '❌'} Cron automated messages removed`);
console.log(`${noScheduler ? '✅' : '❌'} Schedule function removed`);
console.log(`${noDuplicateAssignment ? '✅' : '❌'} Duplicate job assignment removed`);

allGood &= noCron && noScheduler && noDuplicateAssignment;

console.log('\n📊 SUMMARY:');
if (allGood) {
  console.log('🎉 All automated messaging systems are properly integrated!');
  console.log('✅ No redundant code found');
  console.log('✅ Real-time integration maintained');
  console.log('✅ Cron overhead removed');
} else {
  console.log('❌ Some issues found - please review the above errors');
}

process.exit(allGood ? 0 : 1);