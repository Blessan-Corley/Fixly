// utils/sensitiveContentFilter.js

// Patterns to detect sensitive information
const SENSITIVE_PATTERNS = {
  phoneNumber: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|\b\d{10}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  address: /\b\d+\s+[A-Za-z0-9\s,'.-]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|circle|cir|boulevard|blvd|way)\b/gi,
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,
  creditCard: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
  ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
  url: /https?:\/\/[^\s]+/g,
  whatsapp: /(?:whatsapp|wa\.me|chat\.whatsapp)/gi,
  telegram: /(?:telegram|t\.me|@\w+)/gi,
  instagram: /(?:instagram\.com\/|@[\w.]+)/gi,
  facebook: /(?:facebook\.com\/|fb\.com\/)/gi
};

// Warning messages for different types of sensitive content
const WARNING_MESSAGES = {
  phoneNumber: "Phone numbers should not be shared in public comments. Use our private messaging system instead.",
  email: "Email addresses should not be shared in public comments. Use our private messaging system instead.", 
  address: "Street addresses should not be shared in public comments. Use our private messaging system for location details.",
  zipCode: "Postal codes should not be shared in public comments.",
  creditCard: "Credit card numbers should never be shared in comments.",
  ssn: "Social security numbers should never be shared in comments.",
  url: "External links are not allowed in comments for security reasons.",
  whatsapp: "WhatsApp contact sharing should be done through private messages only.",
  telegram: "Telegram contact sharing should be done through private messages only.",
  instagram: "Social media handles should be shared through private messages only.",
  facebook: "Social media links should be shared through private messages only."
};

/**
 * Check if content contains sensitive information
 * @param {string} content - The content to check
 * @returns {Object} - { containsSensitive: boolean, violations: Array, cleanContent: string }
 */
export function filterSensitiveContent(content) {
  if (!content || typeof content !== 'string') {
    return { 
      containsSensitive: false, 
      violations: [], 
      cleanContent: content || '' 
    };
  }

  const violations = [];
  let cleanContent = content;

  // Check for each type of sensitive information
  Object.entries(SENSITIVE_PATTERNS).forEach(([type, pattern]) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      violations.push({
        type,
        message: WARNING_MESSAGES[type],
        matches: matches.length
      });

      // Replace sensitive content with placeholders
      cleanContent = cleanContent.replace(pattern, '[REDACTED]');
    }
  });

  return {
    containsSensitive: violations.length > 0,
    violations,
    cleanContent
  };
}

/**
 * Get a user-friendly error message for sensitive content violations
 * @param {Array} violations - Array of violation objects
 * @returns {string} - User-friendly error message
 */
export function getSensitiveContentErrorMessage(violations) {
  if (violations.length === 0) return '';
  
  if (violations.length === 1) {
    return violations[0].message;
  }
  
  return `Your comment contains sensitive information that cannot be shared publicly:\n${
    violations.map(v => `• ${v.message}`).join('\n')
  }\n\nPlease use our private messaging system for sharing personal contact details.`;
}

/**
 * Check if content contains only mild sensitive information that can be cleaned
 * @param {Array} violations - Array of violation objects  
 * @returns {boolean} - True if content can be auto-cleaned
 */
export function canAutoCleanContent(violations) {
  const severeTypes = ['creditCard', 'ssn'];
  return !violations.some(v => severeTypes.includes(v.type));
}

/**
 * Comprehensive content moderation check
 * @param {string} content - The content to moderate
 * @param {Object} options - Options for moderation
 * @returns {Object} - Moderation result
 */
export function moderateContent(content, options = {}) {
  const { allowAutoClean = false, strictMode = true } = options;
  
  const result = filterSensitiveContent(content);
  
  if (!result.containsSensitive) {
    return {
      allowed: true,
      content: result.cleanContent,
      message: null
    };
  }
  
  // Check for severe violations
  const hasSevereViolations = !canAutoCleanContent(result.violations);
  
  if (hasSevereViolations || strictMode) {
    return {
      allowed: false,
      content: null,
      message: getSensitiveContentErrorMessage(result.violations),
      violations: result.violations
    };
  }
  
  if (allowAutoClean) {
    return {
      allowed: true,
      content: result.cleanContent,
      message: `Your comment has been posted with sensitive information automatically removed for privacy.`,
      violations: result.violations,
      wasModified: true
    };
  }
  
  return {
    allowed: false,
    content: null,
    message: getSensitiveContentErrorMessage(result.violations),
    violations: result.violations
  };
}