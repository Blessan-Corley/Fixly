// lib/validations/content-validator.js - Content validation for abuse, profanity, and spam
import { redisUtils } from '../redis';

// Validation severity levels
export const ValidationSeverity = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

// Violation types
export const ViolationType = {
  PHONE_NUMBER: 'phone_number',
  EMAIL_ADDRESS: 'email_address',
  SOCIAL_MEDIA: 'social_media',
  LOCATION_SHARING: 'location_sharing',
  EXTERNAL_LINK: 'external_link',
  PROFANITY: 'profanity',
  ABUSE: 'abuse',
  SPAM: 'spam',
  PROMOTIONAL: 'promotional',
  REPETITIVE: 'repetitive'
};

// Enhanced pattern library with Indian context
const VALIDATION_PATTERNS = {
  // Phone number patterns (Indian focus)
  phoneNumbers: [
    {
      pattern: /\b[6-9]\d{9}\b/g,
      severity: ValidationSeverity.CRITICAL,
      message: 'Phone numbers are not allowed in public content'
    },
    {
      pattern: /\+91[-.\s]?[6-9]\d{9}\b/g,
      severity: ValidationSeverity.CRITICAL,
      message: 'Phone numbers are not allowed'
    },
    {
      pattern: /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
      severity: ValidationSeverity.CRITICAL,
      message: 'Formatted phone numbers are not allowed'
    },
    {
      pattern: /\b(call|phone|mobile|contact)\s*(me|us)?\s*(at|on|:)?\s*\d/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Contact instructions with numbers not allowed'
    }
  ],

  // Email patterns
  emails: [
    {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      severity: ValidationSeverity.CRITICAL,
      message: 'Email addresses are not allowed in public content'
    },
    {
      pattern: /\b[A-Za-z0-9._%+-]+\s*(at|@)\s*[A-Za-z0-9.-]+\s*(dot|\.)\s*[A-Za-z]{2,}\b/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Disguised email addresses are not allowed'
    }
  ],

  // Social media and messaging apps
  socialMedia: [
    {
      pattern: /\b(whatsapp|whats\s*app|wa)\b/gi,
      severity: ValidationSeverity.CRITICAL,
      message: 'WhatsApp references not allowed in public content'
    },
    {
      pattern: /\b(telegram|tg)\b/gi,
      severity: ValidationSeverity.CRITICAL,
      message: 'Telegram references not allowed'
    },
    {
      pattern: /\b(instagram|insta|ig)\b/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Instagram references not allowed'
    },
    {
      pattern: /\b(facebook|fb)\b/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Facebook references not allowed'
    },
    {
      pattern: /@\w+/g,
      severity: ValidationSeverity.MEDIUM,
      message: 'Social media handles not allowed'
    }
  ],

  // External links
  externalLinks: [
    {
      pattern: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
      severity: ValidationSeverity.HIGH,
      message: 'External links not allowed in public content'
    },
    {
      pattern: /\b(bit\.ly|tinyurl|short\.link|goo\.gl)\b/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Shortened links not allowed'
    }
  ],

  // Promotional content
  promotional: [
    {
      pattern: /\b(free|offer|discount|deal|sale|limited\s*time|act\s*now|hurry)\b/gi,
      severity: ValidationSeverity.MEDIUM,
      message: 'Promotional language detected'
    },
    {
      pattern: /\b(earn\s*money|work\s*from\s*home|investment\s*opportunity|get\s*rich|mlm)\b/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Suspicious promotional content'
    }
  ]
};

// Multi-language profanity database
const PROFANITY_DATABASE = {
  english: [
    'fuck', 'fucking', 'shit', 'damn', 'bitch', 'bastard', 'asshole', 'ass',
    'hell', 'crap', 'piss', 'cock', 'dick', 'pussy', 'slut', 'whore',
    'motherfucker', 'son of a bitch', 'goddamn'
  ],

  tamil: [
    'punda', 'sunni', 'koodhi', 'ommala', 'poda', 'podi', 'maire', 'mairu',
    'naaye', 'paithiyam', 'loose', 'aalu', 'kena', 'thevdiya', 'thevidiya',
    'poolu', 'kunna', 'myre', 'thendi', 'para'
  ],

  hindi: [
    'madarchod', 'behenchod', 'chutiya', 'bhosdike', 'randi', 'saala',
    'kamina', 'harami', 'kutte', 'gandu', 'lavde', 'chodu', 'bhen ka loda',
    'ma ki chut', 'behen ki chut', 'gaandu', 'lund', 'bhosda'
  ],

  malayalam: [
    'thendi', 'potta', 'myre', 'kunna', 'pooru', 'thayoli',
    'maire', 'para', 'poda', 'podi'
  ],

  // Regional variations and misspellings
  variations: [
    'f*ck', 'f**k', 'sh*t', 's**t', 'b*tch', 'a**hole',
    'p0rn', 's3x', 'fuk', 'fck', 'sht', 'btch'
  ]
};

// Context analysis patterns
const CONTEXT_PATTERNS = {
  contactIntent: [
    /\b(contact|reach|call|message|text)\s*(me|us)\b/gi,
    /\b(send|give)\s*(your|me|us)\s*(number|phone|email|whatsapp)\b/gi,
    /\b(my\s*)?(number|phone|email|whatsapp)\s*(is|:)\b/gi
  ],

  urgencyTactics: [
    /\b(urgent|asap|immediate|quickly|fast|hurry)\b/gi,
    /\b(today|tomorrow|right\s*now|this\s*evening)\b/gi
  ]
};

export class ContentValidator {
  static violationCache = new Map();

  /**
   * Main validation function
   */
  static async validateContent(
    content,
    context = 'comment', // 'job_description' | 'job_application' | 'comment' | 'review' | 'profile' | 'private_message'
    userId = null
  ) {
    // Skip validation for private messages
    if (context === 'private_message') {
      return {
        isValid: true,
        violations: [],
        score: 0,
        cleanedContent: content
      };
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(content, context);
    const cached = this.violationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const violations = [];
    let score = 0;

    // 1. Check for sensitive information
    violations.push(...this.checkSensitiveInfo(content));

    // 2. Check for profanity and abuse
    violations.push(...this.checkProfanity(content));

    // 3. Check for spam patterns
    violations.push(...this.checkSpamPatterns(content));

    // 4. Context-specific validation
    violations.push(...this.checkContext(content, context));

    // 5. Calculate total score
    score = violations.reduce((total, v) => total + v.severity, 0);

    // 6. Generate cleaned content if possible
    const cleanedContent = this.generateCleanedContent(content, violations);

    // 7. Generate suggestions
    const suggestions = this.generateSuggestions(violations);

    const result = {
      isValid: score < 10, // Threshold for blocking
      violations,
      score,
      cleanedContent,
      suggestions
    };

    // Cache result
    this.violationCache.set(cacheKey, result);

    // Log violations for monitoring if user provided
    if (userId && violations.length > 0) {
      await this.logUserViolation(userId, content, violations);
    }

    return result;
  }

  /**
   * Check for sensitive information patterns
   */
  static checkSensitiveInfo(content) {
    const violations = [];

    // Check phone numbers
    for (const phonePattern of VALIDATION_PATTERNS.phoneNumbers) {
      const matches = [...content.matchAll(phonePattern.pattern)];
      for (const match of matches) {
        violations.push({
          type: ViolationType.PHONE_NUMBER,
          severity: phonePattern.severity,
          message: phonePattern.message,
          match: match[0],
          position: match.index || 0,
          suggestion: 'Use our messaging system to share contact details after job assignment'
        });
      }
    }

    // Check emails
    for (const emailPattern of VALIDATION_PATTERNS.emails) {
      const matches = [...content.matchAll(emailPattern.pattern)];
      for (const match of matches) {
        violations.push({
          type: ViolationType.EMAIL_ADDRESS,
          severity: emailPattern.severity,
          message: emailPattern.message,
          match: match[0],
          position: match.index || 0,
          suggestion: 'Email sharing is only allowed in private messages'
        });
      }
    }

    // Check social media
    for (const socialPattern of VALIDATION_PATTERNS.socialMedia) {
      const matches = [...content.matchAll(socialPattern.pattern)];
      for (const match of matches) {
        violations.push({
          type: ViolationType.SOCIAL_MEDIA,
          severity: socialPattern.severity,
          message: socialPattern.message,
          match: match[0],
          position: match.index || 0,
          suggestion: 'Contact sharing is only allowed in private chat after job assignment'
        });
      }
    }

    // Check external links
    for (const linkPattern of VALIDATION_PATTERNS.externalLinks) {
      const matches = [...content.matchAll(linkPattern.pattern)];
      for (const match of matches) {
        violations.push({
          type: ViolationType.EXTERNAL_LINK,
          severity: linkPattern.severity,
          message: linkPattern.message,
          match: match[0],
          position: match.index || 0,
          suggestion: 'External links are not allowed in public content'
        });
      }
    }

    return violations;
  }

  /**
   * Check for profanity and abuse words
   */
  static checkProfanity(content) {
    const violations = [];
    const lowerContent = content.toLowerCase();

    // Check all language databases
    const allProfanity = [
      ...PROFANITY_DATABASE.english,
      ...PROFANITY_DATABASE.tamil,
      ...PROFANITY_DATABASE.hindi,
      ...PROFANITY_DATABASE.malayalam,
      ...PROFANITY_DATABASE.variations
    ];

    for (const word of allProfanity) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = [...lowerContent.matchAll(regex)];
      for (const match of matches) {
        violations.push({
          type: ViolationType.ABUSE,
          severity: ValidationSeverity.CRITICAL,
          message: 'Inappropriate language detected',
          match: match[0],
          position: match.index || 0,
          suggestion: 'Please use respectful and professional language'
        });
      }
    }

    return violations;
  }

  /**
   * Check for spam patterns
   */
  static checkSpamPatterns(content) {
    const violations = [];

    // Check promotional content
    for (const promoPattern of VALIDATION_PATTERNS.promotional) {
      const matches = [...content.matchAll(promoPattern.pattern)];
      for (const match of matches) {
        violations.push({
          type: ViolationType.PROMOTIONAL,
          severity: promoPattern.severity,
          message: promoPattern.message,
          match: match[0],
          position: match.index || 0
        });
      }
    }

    // Check repetitive content
    const repetitivePattern = /(.{3,})\1{2,}/g;
    const repetitiveMatches = [...content.matchAll(repetitivePattern)];
    for (const match of repetitiveMatches) {
      violations.push({
        type: ViolationType.REPETITIVE,
        severity: ValidationSeverity.MEDIUM,
        message: 'Repetitive content detected',
        match: match[0],
        position: match.index || 0,
        suggestion: 'Avoid repeating the same text multiple times'
      });
    }

    // Check excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7 && content.length > 20) {
      violations.push({
        type: ViolationType.SPAM,
        severity: ValidationSeverity.MEDIUM,
        message: 'Excessive use of capital letters',
        match: content,
        position: 0,
        suggestion: 'Please avoid writing in all capitals'
      });
    }

    return violations;
  }

  /**
   * Context-specific validation
   */
  static checkContext(content, context) {
    const violations = [];

    // Check for contact intent in public contexts
    if (['comment', 'job_description', 'review'].includes(context)) {
      for (const pattern of CONTEXT_PATTERNS.contactIntent) {
        const matches = [...content.matchAll(pattern)];
        for (const match of matches) {
          violations.push({
            type: ViolationType.SOCIAL_MEDIA,
            severity: ValidationSeverity.HIGH,
            message: 'Contact instructions not allowed in public content',
            match: match[0],
            position: match.index || 0,
            suggestion: 'Contact details can be shared in private messages after job assignment'
          });
        }
      }
    }

    // Check content length
    if (context === 'comment' && content.length > 1000) {
      violations.push({
        type: ViolationType.SPAM,
        severity: ValidationSeverity.LOW,
        message: 'Comment too long',
        match: content,
        position: 0,
        suggestion: 'Please keep comments concise and focused'
      });
    }

    return violations;
  }

  /**
   * Generate cleaned content by removing violations
   */
  static generateCleanedContent(content, violations) {
    let cleaned = content;

    // Remove critical violations
    for (const violation of violations) {
      if (violation.severity >= ValidationSeverity.HIGH) {
        cleaned = cleaned.replace(violation.match, '[REMOVED]');
      }
    }

    return cleaned.trim();
  }

  /**
   * Generate helpful suggestions
   */
  static generateSuggestions(violations) {
    const suggestions = new Set();

    violations.forEach(v => {
      if (v.suggestion) {
        suggestions.add(v.suggestion);
      }
    });

    // Add general suggestions based on violation types
    const violationTypes = violations.map(v => v.type);

    if (violationTypes.includes(ViolationType.PHONE_NUMBER) ||
        violationTypes.includes(ViolationType.EMAIL_ADDRESS)) {
      suggestions.add('Contact details are automatically shared in private messages after job assignment');
    }

    if (violationTypes.includes(ViolationType.PROFANITY) ||
        violationTypes.includes(ViolationType.ABUSE)) {
      suggestions.add('Please maintain professional and respectful communication');
    }

    return Array.from(suggestions);
  }

  /**
   * Generate cache key
   */
  static generateCacheKey(content, context) {
    // Simple hash for caching
    const hash = content.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `${context}:${hash}`;
  }

  /**
   * Log user violations for monitoring
   */
  static async logUserViolation(userId, content, violations) {
    try {
      const key = `content_violations:${userId}`;
      const violation = {
        content: content.substring(0, 100), // Store first 100 chars
        violations: violations.map(v => ({
          type: v.type,
          severity: v.severity,
          message: v.message
        })),
        timestamp: Date.now()
      };

      await redisUtils.setex(`${key}:${Date.now()}`, 30 * 24 * 60 * 60, JSON.stringify(violation)); // 30 days
    } catch (error) {
      console.error('Error logging user violation:', error);
    }
  }

  /**
   * Validate specific content types with tailored rules
   */
  static async validateUsername(username, userId = null) {
    return this.validateContent(username, 'profile', userId);
  }

  static async validateBio(bio, userId = null) {
    return this.validateContent(bio, 'profile', userId);
  }

  static async validateSkills(skills, userId = null) {
    const results = [];
    for (const skill of skills) {
      const result = await this.validateContent(skill.name || skill, 'profile', userId);
      if (!result.isValid) {
        results.push({
          skill: skill.name || skill,
          ...result
        });
      }
    }
    return results;
  }
}

// Export utility functions
export const validateContent = ContentValidator.validateContent.bind(ContentValidator);
export const validateUsername = ContentValidator.validateUsername.bind(ContentValidator);
export const validateBio = ContentValidator.validateBio.bind(ContentValidator);
export const validateSkills = ContentValidator.validateSkills.bind(ContentValidator);

export default ContentValidator;