#!/usr/bin/env node

/**
 * Content Validation Demonstration
 * Shows exactly what happens when users try to post contact details,
 * location info, or abusive words in different contexts
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Import the content validator
const { ContentValidator } = require('../lib/validations/content-validator.js');

console.log('🛡️ FIXLY CONTENT VALIDATION DEMONSTRATION\n');

// Test scenarios
const testScenarios = [
  {
    title: '📱 JOB POSTING with Contact Details',
    context: 'job_description',
    content: 'Looking for a plumber in Bangalore. Contact me at 9876543210 or email fixmyplumbing@gmail.com. Urgent work, call ASAP. Also message me on WhatsApp for faster response.'
  },
  {
    title: '💬 COMMENT with Phone Number',
    context: 'comment',
    content: 'I can do this job perfectly! My number is +91-9876543210. Call me today itself, very urgent work needed.'
  },
  {
    title: '📝 JOB APPLICATION with Location Details',
    context: 'job_application',
    content: 'I have 5 years experience. My address is 123 MG Road, near Cubbon Park, Bangalore 560001. Contact me at johndoe@email.com or WhatsApp me.'
  },
  {
    title: '🤬 COMMENT with Abusive Language (Hindi)',
    context: 'comment',
    content: 'This job poster is a madarchod. Fucking waste of time, behenchod. Don\'t work with this chutiya.'
  },
  {
    title: '😡 JOB POSTING with Tamil Profanity',
    context: 'job_description',
    content: 'Need someone to fix my AC. Previous fixer was a punda, did terrible work. Don\'t be a maire like him.'
  },
  {
    title: '⚠️ SPAM PROMOTIONAL Content',
    context: 'comment',
    content: 'FREE WORK FROM HOME OPPORTUNITY!!! EARN MONEY FAST!!! LIMITED TIME OFFER!!! Contact 9999999999 NOW!!!'
  },
  {
    title: '📧 EMAIL SHARING in Different Formats',
    context: 'job_description',
    content: 'Email me at john.doe@gmail.com or john dot doe at yahoo dot com for this job. Also try johndoe123@hotmail.com'
  },
  {
    title: '🌐 EXTERNAL LINKS and Social Media',
    context: 'comment',
    content: 'Check my work at https://myportfolio.com and follow me @johndoe on Instagram. Also message on Telegram @johnfixer'
  },
  {
    title: '✅ CLEAN PROFESSIONAL Content',
    context: 'job_description',
    content: 'Looking for an experienced plumber to fix kitchen sink issues in Bangalore. Job involves replacing faucets and checking water pressure. Budget is 2000-3000 INR. Professional and reliable service needed.'
  },
  {
    title: '🔄 REPETITIVE SPAM Content',
    context: 'comment',
    content: 'URGENT URGENT URGENT CALL NOW CALL NOW CALL NOW BEST RATES BEST RATES BEST RATES!!!'
  }
];

async function runValidationDemo() {
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];

    console.log(`\n${i + 1}. ${scenario.title}`);
    console.log('=' .repeat(60));
    console.log(`📝 Original Content:`);
    console.log(`"${scenario.content}"\n`);

    try {
      const result = await ContentValidator.validateContent(
        scenario.content,
        scenario.context,
        'demo-user-123'
      );

      // Show validation result
      if (result.isValid) {
        console.log(`✅ STATUS: APPROVED (Score: ${result.score}/10)`);
        console.log(`📤 Content will be posted as-is\n`);
      } else {
        console.log(`❌ STATUS: BLOCKED (Score: ${result.score}/10)`);
        console.log(`🚫 Content will be rejected\n`);

        // Show specific violations
        if (result.violations.length > 0) {
          console.log(`⚠️  VIOLATIONS DETECTED:`);
          result.violations.forEach((violation, idx) => {
            console.log(`   ${idx + 1}. ${violation.type.toUpperCase()}`);
            console.log(`      Problem: "${violation.match}"`);
            console.log(`      Reason: ${violation.message}`);
            console.log(`      Severity: ${violation.severity}/4`);
            if (violation.suggestion) {
              console.log(`      Suggestion: ${violation.suggestion}`);
            }
            console.log('');
          });
        }

        // Show cleaned version if available
        if (result.cleanedContent && result.cleanedContent !== scenario.content) {
          console.log(`🧹 CLEANED VERSION:`);
          console.log(`"${result.cleanedContent}"\n`);
        }

        // Show user-friendly suggestions
        if (result.suggestions && result.suggestions.length > 0) {
          console.log(`💡 SUGGESTIONS FOR USER:`);
          result.suggestions.forEach((suggestion, idx) => {
            console.log(`   • ${suggestion}`);
          });
          console.log('');
        }
      }

    } catch (error) {
      console.log(`❌ VALIDATION ERROR: ${error.message}\n`);
    }
  }

  // Summary of what happens in the UI
  console.log('\n' + '='.repeat(80));
  console.log('📱 WHAT USERS SEE IN THE APP');
  console.log('='.repeat(80));

  console.log(`
🔴 WHEN CONTENT IS BLOCKED:
   • Red error message appears: "Content contains inappropriate information"
   • Specific violations listed (e.g., "Phone numbers not allowed in public posts")
   • Helpful suggestions shown (e.g., "Contact details can be shared in private messages")
   • Submit/Post button remains disabled until content is fixed
   • User can edit content and try again

🟡 WHEN CONTENT IS CLEANED:
   • Yellow warning appears: "Some content was automatically removed"
   • Shows before/after comparison
   • User can accept cleaned version or edit manually
   • Explains why content was cleaned

🟢 WHEN CONTENT IS APPROVED:
   • Content posts immediately with real-time broadcasting
   • No delays or additional validation
   • Appears in job feed/comments instantly

🔒 PRIVACY & SECURITY FEATURES:
   • All validation happens server-side (can't be bypassed)
   • Contact details automatically shared in private messages after job assignment
   • Multiple languages supported (English, Hindi, Tamil, Telugu, etc.)
   • AI-powered spam detection with pattern learning
   • User violation history tracked for repeat offenders

📊 REAL-TIME EFFECTS:
   • Blocked content never reaches other users
   • Clean content broadcasts immediately via Ably
   • Comments/jobs appear instantly in real-time feed
   • No performance impact on approved content
  `);

  console.log('\n🎯 EXAMPLES OF WHAT GETS BLOCKED VS ALLOWED:\n');

  console.log('❌ BLOCKED:');
  console.log('   • "Call me at 9876543210"');
  console.log('   • "Email: john@gmail.com"');
  console.log('   • "WhatsApp me for details"');
  console.log('   • "Check https://mysite.com"');
  console.log('   • "Madarchod, chutiya, fucking"');
  console.log('   • "FREE MONEY!!! URGENT!!!"');
  console.log('   • "My address is 123 Main St"');

  console.log('\n✅ ALLOWED:');
  console.log('   • "I have 5 years experience in plumbing"');
  console.log('   • "Available for work in Bangalore area"');
  console.log('   • "Can start work immediately"');
  console.log('   • "Budget seems reasonable for this job"');
  console.log('   • "What tools will be needed?"');
  console.log('   • "Looking forward to working with you"');

  console.log('\n💬 CONTACT SHARING WORKFLOW:');
  console.log('1. User applies to job → Contact details hidden from public');
  console.log('2. Hirer accepts application → Private message channel created');
  console.log('3. Contact details automatically shared in private messages');
  console.log('4. Both parties can communicate freely with full contact info');
  console.log('5. Public job feed remains spam-free and professional');

  console.log('\n🛡️ MULTI-LAYER PROTECTION:');
  console.log('• Frontend: Real-time content preview with warnings');
  console.log('• Backend: Server-side validation that cannot be bypassed');
  console.log('• Database: Rejected content never stored');
  console.log('• Real-time: Only clean content broadcasts via Ably');
  console.log('• UI: Masked display of any remaining sensitive data');

  console.log('\n🎉 RESULT: Clean, Professional, Spam-Free Experience!');
}

// Run the demonstration
if (require.main === module) {
  runValidationDemo().catch(error => {
    console.error('Demo error:', error);
  });
}

module.exports = { runValidationDemo };