import { logger } from '@/lib/logger';
import {
  ValidationSeverity,
  ViolationType,
  type ContentViolation,
  type PatternRule,
  type ViolationTypeValue,
} from '@/lib/validations/content/content.types';
import { getMatchesWithPositions } from '@/lib/validations/content/rules/policy';

const SENSITIVE_INFO_PATTERNS: {
  phoneNumbers: PatternRule[];
  emails: PatternRule[];
  socialMedia: PatternRule[];
  externalLinks: PatternRule[];
  locationSharing: PatternRule[];
} = {
  phoneNumbers: [
    {
      pattern: /\b[6-9]\d{9}\b/g,
      severity: ValidationSeverity.CRITICAL,
      message: 'Phone numbers are not allowed in public content',
    },
    {
      pattern: /\+91[-.\s]?[6-9]\d{9}\b/g,
      severity: ValidationSeverity.CRITICAL,
      message: 'Phone numbers are not allowed',
    },
    {
      pattern: /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
      severity: ValidationSeverity.CRITICAL,
      message: 'Formatted phone numbers are not allowed',
    },
    {
      pattern: /\b(call|phone|mobile|contact)\s*(me|us)?\s*(at|on|:)?\s*\d/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Contact instructions with numbers not allowed',
    },
  ],
  emails: [
    {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      severity: ValidationSeverity.CRITICAL,
      message: 'Email addresses are not allowed in public content',
    },
    {
      pattern: /\b[A-Za-z0-9._%+-]+\s*(at|@)\s*[A-Za-z0-9.-]+\s*(dot|\.)\s*[A-Za-z]{2,}\b/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Disguised email addresses are not allowed',
    },
  ],
  socialMedia: [
    {
      pattern: /\b(whatsapp|whats\s*app|wa)\b/gi,
      severity: ValidationSeverity.CRITICAL,
      message: 'WhatsApp references not allowed in public content',
    },
    {
      pattern: /\b(telegram|tg)\b/gi,
      severity: ValidationSeverity.CRITICAL,
      message: 'Telegram references not allowed',
    },
    {
      pattern: /\b(instagram|insta|ig)\b/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Instagram references not allowed',
    },
    {
      pattern: /\b(facebook|fb)\b/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Facebook references not allowed',
    },
    {
      pattern: /@\w+/g,
      severity: ValidationSeverity.MEDIUM,
      message: 'Social media handles not allowed',
    },
  ],
  externalLinks: [
    {
      pattern:
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
      severity: ValidationSeverity.HIGH,
      message: 'External links not allowed in public content',
    },
    {
      pattern: /\b(bit\.ly|tinyurl|short\.link|goo\.gl)\b/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Shortened links not allowed',
    },
  ],
  locationSharing: [
    {
      pattern:
        /\b\d{1,5}\s+[a-z0-9\s,.'-]{3,}\s(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|circle|cir|boulevard|blvd|way)\b/gi,
      severity: ValidationSeverity.HIGH,
      message: 'Street address details are not allowed in public content',
    },
    {
      pattern:
        /\b(?:pin(?:code)?|zip(?:code)?|postal(?:\s*code)?)\s*[:\-]?\s*\d{5,6}(?:-\d{4})?\b/gi,
      severity: ValidationSeverity.MEDIUM,
      message: 'Postal code sharing is not allowed in public content',
    },
    {
      pattern: /\b-?\d{1,2}\.\d{4,},\s*-?\d{1,3}\.\d{4,}\b/g,
      severity: ValidationSeverity.HIGH,
      message: 'Map coordinates are not allowed in public content',
    },
  ],
};

export function checkSensitiveInfo(content: string): ContentViolation[] {
  const violations: ContentViolation[] = [];

  const collect = (rules: PatternRule[], type: ViolationTypeValue, suggestion: string) => {
    for (const rule of rules) {
      try {
        const matches = getMatchesWithPositions(content, rule.pattern);
        matches.forEach(({ match, index }) => {
          violations.push({
            type,
            severity: rule.severity,
            message: rule.message,
            match,
            position: index,
            suggestion,
          });
        });
      } catch (error: unknown) {
        logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Content pattern error');
      }
    }
  };

  collect(
    SENSITIVE_INFO_PATTERNS.phoneNumbers,
    ViolationType.PHONE_NUMBER,
    'Use our messaging system to share contact details after job assignment'
  );

  collect(
    SENSITIVE_INFO_PATTERNS.emails,
    ViolationType.EMAIL_ADDRESS,
    'Email sharing is only allowed in private messages'
  );

  collect(
    SENSITIVE_INFO_PATTERNS.socialMedia,
    ViolationType.SOCIAL_MEDIA,
    'Contact sharing is only allowed in private chat after job assignment'
  );

  collect(
    SENSITIVE_INFO_PATTERNS.externalLinks,
    ViolationType.EXTERNAL_LINK,
    'External links are not allowed in public content'
  );

  collect(
    SENSITIVE_INFO_PATTERNS.locationSharing,
    ViolationType.LOCATION_SHARING,
    'Do not share precise addresses or map coordinates in public marketplace content'
  );

  return violations;
}
