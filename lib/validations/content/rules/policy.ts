import { logger } from '@/lib/logger';
import {
  ValidationSeverity,
  ViolationType,
  type ContentViolation,
  type ValidationContext,
  type ValidationPolicy,
  type ViolationTypeValue,
} from '@/lib/validations/content/content.types';

const CONTACT_INTENT_CONTEXTS = new Set<string>([
  'job_posting',
  'job_draft',
  'job_description',
  'job_application',
  'comment',
  'review',
  'dispute',
  'portfolio',
  'profile',
  'general',
]);

const CONTEXT_PATTERNS = {
  contactIntent: [
    /\b(contact|reach|call|message|text)\s*(me|us)\b/gi,
    /\b(send|give)\s*(your|me|us)\s*(number|phone|email|whatsapp)\b/gi,
    /\b(my\s*)?(number|phone|email|whatsapp)\s*(is|:)\b/gi,
  ],
};

export function normalizeContent(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

export function cloneRegexWithGlobal(pattern: RegExp): RegExp {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

export function normalizeContextName(context: ValidationContext): string {
  return typeof context === 'string' && context.trim().length > 0
    ? context.trim().toLowerCase()
    : 'comment';
}

export function getValidationPolicy(context: string): ValidationPolicy {
  if (context === 'private_message') {
    return {
      allowSensitiveInfo: true,
      blockHighSeverity: false,
      blockedTypes: new Set<ViolationTypeValue>([ViolationType.PROFANITY, ViolationType.ABUSE]),
    };
  }

  if (context === 'notification') {
    return {
      allowSensitiveInfo: true,
      blockHighSeverity: false,
      blockedTypes: new Set<ViolationTypeValue>([ViolationType.PROFANITY, ViolationType.ABUSE]),
    };
  }

  return {
    allowSensitiveInfo: false,
    blockHighSeverity: true,
    blockedTypes: new Set<ViolationTypeValue>([
      ViolationType.PHONE_NUMBER,
      ViolationType.EMAIL_ADDRESS,
      ViolationType.SOCIAL_MEDIA,
      ViolationType.EXTERNAL_LINK,
      ViolationType.LOCATION_SHARING,
      ViolationType.PROFANITY,
      ViolationType.ABUSE,
    ]),
  };
}

export function shouldBlockViolation(
  violation: ContentViolation,
  policy: ValidationPolicy
): boolean {
  if (policy.blockedTypes.has(violation.type)) {
    return true;
  }

  if (policy.blockHighSeverity && violation.severity >= ValidationSeverity.HIGH) {
    return true;
  }

  return false;
}

export function getMatchesWithPositions(
  content: string,
  pattern: RegExp
): Array<{ match: string; index: number }> {
  const regex = cloneRegexWithGlobal(pattern);
  const matches: Array<{ match: string; index: number }> = [];

  let execMatch: RegExpExecArray | null = regex.exec(content);
  while (execMatch) {
    const value = execMatch[0];
    const index = execMatch.index ?? -1;
    if (value && index >= 0) {
      matches.push({ match: value, index });
    }
    execMatch = regex.exec(content);
  }

  return matches;
}

export function checkContextViolations(
  content: string,
  context: ValidationContext
): ContentViolation[] {
  const violations: ContentViolation[] = [];
  const normalizedContext = normalizeContextName(context);

  if (CONTACT_INTENT_CONTEXTS.has(normalizedContext)) {
    for (const pattern of CONTEXT_PATTERNS.contactIntent) {
      try {
        const matches = getMatchesWithPositions(content, pattern);
        matches.forEach(({ match, index }) => {
          violations.push({
            type: ViolationType.SOCIAL_MEDIA,
            severity: ValidationSeverity.HIGH,
            message: 'Contact instructions not allowed in public content',
            match,
            position: index,
            suggestion: 'Contact details can be shared in private messages after job assignment',
          });
        });
      } catch (error: unknown) {
        logger.warn(
          { error: error instanceof Error ? error.message : String(error) },
          'Contact intent pattern error'
        );
      }
    }
  }

  if (normalizedContext === 'comment' && content.length > 1000) {
    violations.push({
      type: ViolationType.SPAM,
      severity: ValidationSeverity.LOW,
      message: 'Comment too long',
      match: content,
      position: 0,
      suggestion: 'Please keep comments concise and focused',
    });
  }

  return violations;
}
