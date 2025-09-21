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
    // Core profanity
    'fuck', 'fucking', 'fucked', 'fucker', 'fucks', 'shit', 'shitting', 'shits', 'shitty',
    'damn', 'damned', 'dammit', 'bitch', 'bitching', 'bitches', 'bastard', 'bastards',
    'asshole', 'assholes', 'ass', 'asses', 'hell', 'hells', 'crap', 'crappy', 'craps',
    'piss', 'pissed', 'pissing', 'cock', 'cocks', 'dick', 'dicks', 'dickhead', 'dickheads',
    'pussy', 'pussies', 'slut', 'sluts', 'slutty', 'whore', 'whores', 'whorish',

    // Compound profanity
    'motherfucker', 'motherfucking', 'motherfuckers', 'son of a bitch', 'goddamn', 'goddamned',
    'dumbass', 'dumbasses', 'jackass', 'jackasses', 'smartass', 'badass', 'fatass',
    'bullshit', 'horseshit', 'dipshit', 'shithead', 'shitheads', 'fuckface', 'fuckfaces',
    'cocksucker', 'cocksuckers', 'fucking hell', 'holy shit', 'what the fuck', 'wtf',

    // Sexual content
    'cunt', 'cunts', 'twat', 'twats', 'tits', 'titties', 'boobs', 'boobies', 'breasts',
    'penis', 'penises', 'vagina', 'vaginas', 'anal', 'anus', 'blowjob', 'blowjobs',
    'handjob', 'handjobs', 'orgasm', 'orgasms', 'masturbate', 'masturbation',
    'sex', 'sexual', 'sexy', 'horny', 'aroused', 'erection', 'climax',

    // Slurs and offensive terms
    'retard', 'retarded', 'retards', 'fag', 'faggot', 'faggots', 'gay' /* as slur */,
    'nigger', 'nigga', 'niggas', 'spic', 'spics', 'chink', 'chinks', 'gook', 'gooks',
    'kike', 'kikes', 'wetback', 'wetbacks', 'beaner', 'beaners', 'towelhead', 'towelheads',

    // Derogatory terms
    'stupid', 'idiot', 'idiots', 'moron', 'morons', 'imbecile', 'imbeciles', 'dumb', 'dumber',
    'loser', 'losers', 'freak', 'freaks', 'creep', 'creeps', 'pervert', 'perverts',
    'sicko', 'sickos', 'weirdo', 'weirdos', 'psycho', 'psychos', 'nutjob', 'nutjobs',

    // Variations and misspellings
    'fuk', 'fck', 'sht', 'btch', 'dum', 'stpd', 'fkn', 'shyt', 'azz', 'biatch'
  ],

  tamil: [
    // Core Tamil profanity
    'punda', 'pundai', 'sunni', 'sunnis', 'koodhi', 'koodhis', 'ommala', 'ommalas',
    'poda', 'podi', 'maire', 'mairu', 'mairus', 'naaye', 'naayes', 'naay',
    'paithiyam', 'paithiyams', 'loose', 'aalu', 'aalus', 'kena', 'kenas',

    // Sexual/vulgar terms
    'thevdiya', 'thevidiya', 'thevdiyas', 'poolu', 'poulus', 'kunna', 'kunnas',
    'myre', 'myres', 'thendi', 'thendis', 'para', 'paras', 'otha', 'othas',
    'othaiyya', 'othaiyyas', 'kenna', 'kennas', 'loosu', 'loosus',

    // Combinations and variations
    'mental', 'mentals', 'poda maire', 'podi maire', 'maire punda', 'sunni maire',
    'koodhi maire', 'naaye punda', 'thendi punda', 'loosu punda', 'mental punda',
    'ommala punda', 'aalu punda', 'kena punda', 'para punda',

    // Common insults
    'mandayan', 'mandayans', 'muttal', 'muttals', 'loose aalu', 'mental aalu',
    'thendi naaye', 'maire naaye', 'punda naaye', 'koodhi naaye'
  ],

  hindi: [
    // Core Hindi profanity
    'madarchod', 'madarchods', 'madharchod', 'behenchod', 'behenchods', 'bhenchod', 'bhenchods',
    'chutiya', 'chutiyas', 'chutiye', 'bhosdike', 'bhosadike', 'bhosadikes', 'randi', 'randis',
    'saala', 'saalas', 'sala', 'saali', 'saalis', 'kamina', 'kaminas', 'kamine',
    'harami', 'haramis', 'haramkhor', 'haramkhors', 'kutte', 'kuttes', 'kutta', 'kuttas',

    // Sexual/vulgar terms
    'gandu', 'gandus', 'gaandu', 'gaandus', 'lavde', 'lavdes', 'laude', 'laudes',
    'chodu', 'chodis', 'lund', 'lunds', 'bhosda', 'bhosdas', 'chut', 'chuts',
    'gaand', 'gaands', 'jhaant', 'jhaants', 'jhaat', 'jhaats',

    // Compound insults
    'bhen ka loda', 'bhen ke lode', 'bhen ke laude', 'ma ki chut', 'maa ki chut',
    'behen ki chut', 'teri maa', 'teri behen', 'teri gaand', 'maa chuda',
    'behen chod', 'baap chod', 'gaand mara', 'lund choos', 'randi ki aulad',

    // Variations and slang
    'randwa', 'randwas', 'chinaal', 'chinaals', 'kutiya', 'kutiyas', 'kamini', 'kaminis',
    'bc', 'mc', 'bkl', 'mkl', 'bhkl', 'chodu ram', 'madarchod saala', 'behenchod harami',

    // Regional variations
    'chodu panti', 'gandu aadmi', 'harami aurat', 'kamina aadmi', 'randi aurat',
    'saala kutta', 'madarchod kutta', 'bhosdike kamine', 'chutiya harami'
  ],

  malayalam: [
    'thendi', 'potta', 'myre', 'kunna', 'pooru', 'thayoli',
    'maire', 'para', 'poda', 'podi', 'myru', 'poorru',
    'thendi mone', 'potta myre', 'kunna myre'
  ],

  telugu: [
    'dengey', 'lanjkoduku', 'lanjakoduku', 'boothulu', 'modda', 'puku',
    'gulthi', 'gudda', 'dengamma', 'rascal', 'waste fellow',
    'lanjakodaki', 'badava', 'gadida', 'bokka', 'sanka nakem'
  ],

  kannada: [
    'boli', 'boli maga', 'gubbu', 'bevarsi', 'nayi', 'kiru',
    'sullu', 'waste', 'kelbedi', 'muchko', 'bekku',
    'kathe', 'chapri', 'loose', 'mental'
  ],

  marathi: [
    'madarchod', 'bhenchod', 'randi', 'lavda', 'lund', 'chut',
    'gandu', 'chutiya', 'randya', 'kutra', 'dongar',
    'rascal', 'gadya', 'veda', 'pagal'
  ],

  gujarati: [
    'madarchod', 'behen no lodo', 'randi', 'lund', 'gandu',
    'kutti', 'chutiya', 'gadhedo', 'bokachodo', 'pela',
    'vedio', 'dhakkan', 'kallu', 'bewakoof'
  ],

  punjabi: [
    'madarchod', 'bhenchod', 'randi', 'lund', 'gandu', 'chutiya',
    'kamina', 'harami', 'kutte', 'sala', 'bhosdike',
    'pendu', 'gadhe', 'ullu', 'bekaar'
  ],

  bengali: [
    'madarchod', 'magir pola', 'chudna', 'rand', 'bal', 'chude',
    'gandu', 'khankir chele', 'tor maa', 'haram',
    'gadha', 'pagol', 'mental', 'boka'
  ],

  // Regional variations and misspellings
  variations: [
    'f*ck', 'f**k', 'sh*t', 's**t', 'b*tch', 'a**hole',
    'p0rn', 's3x', 'fuk', 'fck', 'sht', 'btch', 'dmn',
    'd4mn', 'h3ll', 'cr4p', 'b1tch', 'a55', 'a55hole',
    'fuc', 'fuk', 'phuck', 'phuk', 'shiit', 'sh1t',
    'b!tch', 'bit*h', 'da*n', 'd@mn', 'he||', 'cr@p'
  ],

  // Inappropriate content
  inappropriate: [
    'nazi', 'hitler', 'terrorist', 'isis', 'bomb', 'gun', 'weapon',
    'kill', 'murder', 'death', 'suicide', 'drug', 'cocaine', 'heroin',
    'weed', 'marijuana', 'cannabis', 'meth', 'crack', 'scam', 'fraud',
    'casino', 'gambling', 'porn', 'xxx', 'sex', 'nude', 'naked',
    'erotic', 'adult', 'prostitute', 'escort', 'hooker'
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

    try {
      // Check phone numbers
      for (const phonePattern of VALIDATION_PATTERNS.phoneNumbers) {
        try {
          const matches = content.match(phonePattern.pattern) || [];
          matches.forEach((match, index) => {
            violations.push({
              type: ViolationType.PHONE_NUMBER,
              severity: phonePattern.severity,
              message: phonePattern.message,
              match: match,
              position: content.indexOf(match),
              suggestion: 'Use our messaging system to share contact details after job assignment'
            });
          });
        } catch (error) {
          console.warn('Phone pattern error:', error.message);
        }
      }

      // Check emails
      for (const emailPattern of VALIDATION_PATTERNS.emails) {
        try {
          const matches = content.match(emailPattern.pattern) || [];
          matches.forEach((match, index) => {
            violations.push({
              type: ViolationType.EMAIL_ADDRESS,
              severity: emailPattern.severity,
              message: emailPattern.message,
              match: match,
              position: content.indexOf(match),
              suggestion: 'Email sharing is only allowed in private messages'
            });
          });
        } catch (error) {
          console.warn('Email pattern error:', error.message);
        }
      }

      // Check social media
      for (const socialPattern of VALIDATION_PATTERNS.socialMedia) {
        try {
          const matches = content.match(socialPattern.pattern) || [];
          matches.forEach((match, index) => {
            violations.push({
              type: ViolationType.SOCIAL_MEDIA,
              severity: socialPattern.severity,
              message: socialPattern.message,
              match: match,
              position: content.indexOf(match),
              suggestion: 'Contact sharing is only allowed in private chat after job assignment'
            });
          });
        } catch (error) {
          console.warn('Social media pattern error:', error.message);
        }
      }

      // Check external links
      for (const linkPattern of VALIDATION_PATTERNS.externalLinks) {
        try {
          const matches = content.match(linkPattern.pattern) || [];
          matches.forEach((match, index) => {
            violations.push({
              type: ViolationType.EXTERNAL_LINK,
              severity: linkPattern.severity,
              message: linkPattern.message,
              match: match,
              position: content.indexOf(match),
              suggestion: 'External links are not allowed in public content'
            });
          });
        } catch (error) {
          console.warn('External link pattern error:', error.message);
        }
      }
    } catch (error) {
      console.error('Content validation error:', error);
    }

    return violations;
  }

  /**
   * Check for profanity and abuse words
   */
  static checkProfanity(content) {
    const violations = [];

    try {
      const lowerContent = content.toLowerCase();

      // Check all language databases
      const allProfanity = [
        ...PROFANITY_DATABASE.english,
        ...PROFANITY_DATABASE.tamil,
        ...PROFANITY_DATABASE.hindi,
        ...PROFANITY_DATABASE.malayalam,
        ...PROFANITY_DATABASE.telugu,
        ...PROFANITY_DATABASE.kannada,
        ...PROFANITY_DATABASE.marathi,
        ...PROFANITY_DATABASE.gujarati,
        ...PROFANITY_DATABASE.punjabi,
        ...PROFANITY_DATABASE.bengali,
        ...PROFANITY_DATABASE.variations,
        ...PROFANITY_DATABASE.inappropriate
      ];

      for (const word of allProfanity) {
        try {
          // Escape special regex characters
          const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
          const matches = lowerContent.match(regex) || [];

          matches.forEach(match => {
            violations.push({
              type: ViolationType.ABUSE,
              severity: ValidationSeverity.CRITICAL,
              message: 'Inappropriate language detected',
              match: match,
              position: lowerContent.indexOf(match),
              suggestion: 'Please use respectful and professional language'
            });
          });
        } catch (error) {
          console.warn(`Profanity check error for word "${word}":`, error.message);
        }
      }
    } catch (error) {
      console.error('Profanity validation error:', error);
    }

    return violations;
  }

  /**
   * Check for spam patterns
   */
  static checkSpamPatterns(content) {
    const violations = [];

    try {
      // Check promotional content
      for (const promoPattern of VALIDATION_PATTERNS.promotional) {
        try {
          const matches = content.match(promoPattern.pattern) || [];
          matches.forEach(match => {
            violations.push({
              type: ViolationType.PROMOTIONAL,
              severity: promoPattern.severity,
              message: promoPattern.message,
              match: match,
              position: content.indexOf(match)
            });
          });
        } catch (error) {
          console.warn('Promotional pattern error:', error.message);
        }
      }

      // Check repetitive content
      try {
        const repetitivePattern = /(.{3,})\1{2,}/g;
        const repetitiveMatches = content.match(repetitivePattern) || [];
        repetitiveMatches.forEach(match => {
          violations.push({
            type: ViolationType.REPETITIVE,
            severity: ValidationSeverity.MEDIUM,
            message: 'Repetitive content detected',
            match: match,
            position: content.indexOf(match),
            suggestion: 'Avoid repeating the same text multiple times'
          });
        });
      } catch (error) {
        console.warn('Repetitive pattern error:', error.message);
      }

      // Check excessive caps
      try {
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
      } catch (error) {
        console.warn('Caps ratio error:', error.message);
      }
    } catch (error) {
      console.error('Spam pattern validation error:', error);
    }

    return violations;
  }

  /**
   * Context-specific validation
   */
  static checkContext(content, context) {
    const violations = [];

    try {
      // Check for contact intent in public contexts
      if (['comment', 'job_description', 'review'].includes(context)) {
        for (const pattern of CONTEXT_PATTERNS.contactIntent) {
          try {
            const matches = content.match(pattern) || [];
            matches.forEach(match => {
              violations.push({
                type: ViolationType.SOCIAL_MEDIA,
                severity: ValidationSeverity.HIGH,
                message: 'Contact instructions not allowed in public content',
                match: match,
                position: content.indexOf(match),
                suggestion: 'Contact details can be shared in private messages after job assignment'
              });
            });
          } catch (error) {
            console.warn('Contact intent pattern error:', error.message);
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
    } catch (error) {
      console.error('Context validation error:', error);
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