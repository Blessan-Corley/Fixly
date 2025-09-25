#!/usr/bin/env node

/**
 * Content Protection Demonstration
 * Shows exactly what happens when users try to share sensitive info
 */

console.log('🛡️ FIXLY CONTENT PROTECTION SYSTEM\n');

// Simplified validation patterns (from the actual system)
const BLOCKED_PATTERNS = {
  phoneNumbers: [
    /\b[6-9]\d{9}\b/g,           // Indian mobile numbers
    /\+91[-.\s]?[6-9]\d{9}\b/g,  // +91 format
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g // Formatted numbers
  ],
  emails: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    /\b[A-Za-z0-9._%+-]+\s*(at|@)\s*[A-Za-z0-9.-]+\s*(dot|\.)\s*[A-Za-z]{2,}\b/gi
  ],
  socialMedia: [
    /\b(whatsapp|whats\s*app|wa)\b/gi,
    /\b(telegram|tg)\b/gi,
    /\b(instagram|insta|ig)\b/gi,
    /\b(facebook|fb)\b/gi
  ],
  profanity: [
    'fuck', 'fucking', 'shit', 'bitch', 'damn', 'ass', 'asshole',
    'madarchod', 'behenchod', 'chutiya', 'bhosdike', 'randi',
    'punda', 'pundai', 'maire', 'naaye', 'loosu'
  ],
  externalLinks: [
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/gi
  ]
};

// Sanitization function (from JobCardRectangular.js)
function sanitizeText(text) {
  if (!text) return '';

  let sanitized = text;

  // Replace phone numbers
  sanitized = sanitized.replace(/\b[6-9]\d{9}\b/g, '***CONTACT***');
  sanitized = sanitized.replace(/\+91[-.\s]?[6-9]\d{9}\b/g, '***CONTACT***');

  // Replace emails
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, '***EMAIL***');

  // Replace social media
  sanitized = sanitized.replace(/\b(whatsapp|telegram|instagram|facebook|twitter)\b/gi, '***SOCIAL***');

  return sanitized;
}

// Validation function
function validateContent(content, context) {
  const violations = [];
  let score = 0;

  // Check phone numbers
  BLOCKED_PATTERNS.phoneNumbers.forEach(pattern => {
    const matches = content.match(pattern) || [];
    matches.forEach(match => {
      violations.push({
        type: 'PHONE_NUMBER',
        severity: 4, // Critical
        match: match,
        message: 'Phone numbers are not allowed in public content'
      });
      score += 4;
    });
  });

  // Check emails
  BLOCKED_PATTERNS.emails.forEach(pattern => {
    const matches = content.match(pattern) || [];
    matches.forEach(match => {
      violations.push({
        type: 'EMAIL_ADDRESS',
        severity: 4, // Critical
        match: match,
        message: 'Email addresses are not allowed in public content'
      });
      score += 4;
    });
  });

  // Check social media
  BLOCKED_PATTERNS.socialMedia.forEach(pattern => {
    const matches = content.match(pattern) || [];
    matches.forEach(match => {
      violations.push({
        type: 'SOCIAL_MEDIA',
        severity: 4, // Critical
        match: match,
        message: 'Social media references not allowed'
      });
      score += 4;
    });
  });

  // Check profanity
  BLOCKED_PATTERNS.profanity.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = content.match(regex) || [];
    matches.forEach(match => {
      violations.push({
        type: 'PROFANITY',
        severity: 4, // Critical
        match: match,
        message: 'Inappropriate language detected'
      });
      score += 4;
    });
  });

  // Check external links
  BLOCKED_PATTERNS.externalLinks.forEach(pattern => {
    const matches = content.match(pattern) || [];
    matches.forEach(match => {
      violations.push({
        type: 'EXTERNAL_LINK',
        severity: 3, // High
        match: match,
        message: 'External links not allowed in public content'
      });
      score += 3;
    });
  });

  return {
    isValid: score < 4, // Block if score >= 4
    violations,
    score,
    cleanedContent: sanitizeText(content)
  };
}

// Test scenarios
const testScenarios = [
  {
    title: '📱 JOB POSTING with Contact Details',
    content: 'Looking for plumber in Bangalore. Contact me at 9876543210 or email me at fixmyhouse@gmail.com. Also WhatsApp me for urgent work.'
  },
  {
    title: '💬 COMMENT with Phone Number',
    content: 'I can do this job! Call me at +91-9876543210 today itself.'
  },
  {
    title: '🤬 ABUSIVE COMMENT (Hindi)',
    content: 'This job poster is madarchod. Fucking waste, behenchod!'
  },
  {
    title: '😡 TAMIL PROFANITY',
    content: 'Previous fixer was punda. Don\'t be maire like him.'
  },
  {
    title: '📧 EMAIL in Job Description',
    content: 'Send your portfolio to johndoe@gmail.com or contact john.doe@yahoo.com'
  },
  {
    title: '🌐 SOCIAL MEDIA & Links',
    content: 'Check my Instagram @johndoe or visit https://myportfolio.com'
  },
  {
    title: '✅ CLEAN PROFESSIONAL Content',
    content: 'Experienced plumber available in Bangalore. Can fix kitchen and bathroom issues. Reasonable rates and quality work guaranteed.'
  }
];

console.log('🚨 WHAT HAPPENS WHEN YOU POST PROHIBITED CONTENT:\n');

testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.title}`);
  console.log('─'.repeat(50));
  console.log(`Original: "${scenario.content}"`);

  const result = validateContent(scenario.content, 'public');

  if (result.isValid) {
    console.log(`✅ STATUS: APPROVED - Content will be posted`);
    console.log(`📤 Displays: "${scenario.content}"`);
  } else {
    console.log(`❌ STATUS: BLOCKED - Content rejected`);
    console.log(`🚫 Score: ${result.score}/10 (blocked at 4+)`);

    if (result.violations.length > 0) {
      console.log(`⚠️  Problems found:`);
      result.violations.forEach(v => {
        console.log(`   • ${v.type}: "${v.match}" - ${v.message}`);
      });
    }

    console.log(`🧹 If displayed in UI: "${result.cleanedContent}"`);
  }

  console.log('');
});

console.log('═'.repeat(80));
console.log('📱 USER EXPERIENCE IN THE APP');
console.log('═'.repeat(80));

console.log(`
🔴 WHEN YOU TRY TO POST CONTACT DETAILS:

   Job Description: "Need plumber, call 9876543210"

   What happens:
   ❌ Red error message appears
   💬 "Phone numbers not allowed in public posts"
   💡 "Contact details are shared automatically in private messages"
   🚫 Submit button stays disabled until you remove the number

🔴 WHEN YOU USE ABUSIVE LANGUAGE:

   Comment: "This guy is a madarchod"

   What happens:
   ❌ Content blocked immediately
   💬 "Inappropriate language detected"
   💡 "Please use respectful and professional language"
   📝 Must rewrite comment to post

🔴 WHEN YOU SHARE EMAIL/SOCIAL MEDIA:

   Application: "Email me at john@gmail.com or WhatsApp"

   What happens:
   ❌ Application rejected
   💬 "Contact details not allowed in public content"
   💡 "Contact info is shared automatically after job assignment"

🟢 WHAT YOU SHOULD POST INSTEAD:

   ✅ "Experienced plumber available in Bangalore area"
   ✅ "I have 5 years experience with kitchen repairs"
   ✅ "Can start work immediately, reasonable rates"
   ✅ "Available for both residential and commercial work"

🔒 PRIVACY & CONTACT SHARING:

   1. You apply to a job → Your contact stays private
   2. Hirer accepts your application → Private message opens
   3. Contact details automatically shared in private chat
   4. Both can communicate freely with full contact info
   5. Public job feed stays clean and professional

🛡️ REAL-TIME PROTECTION:

   • Validation happens server-side (can't be bypassed)
   • Multiple languages supported (Hindi, Tamil, Telugu, etc.)
   • Sensitive content never reaches other users
   • Clean content broadcasts immediately in real-time
   • No delays for approved content

📊 WHAT GETS MASKED IN JOB CARDS:

   Original: "Call me at 9876543210 for urgent work"
   Displayed: "Call me at ***CONTACT*** for urgent work"

   Original: "Email: john@gmail.com"
   Displayed: "Email: ***EMAIL***"

   Original: "WhatsApp me for details"
   Displayed: "***SOCIAL*** me for details"
`);

console.log('\n🎯 SUMMARY: Multiple layers protect users from spam and keep the platform professional!');