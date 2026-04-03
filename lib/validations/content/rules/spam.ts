import { logger } from '@/lib/logger';
import {
  ValidationSeverity,
  ViolationType,
  type ContentViolation,
  type PatternRule,
} from '@/lib/validations/content/content.types';
import { getMatchesWithPositions } from '@/lib/validations/content/rules/policy';

const PROMOTIONAL_PATTERNS: PatternRule[] = [
  {
    pattern: /\b(free|offer|discount|deal|sale|limited\s*time|act\s*now|hurry)\b/gi,
    severity: ValidationSeverity.MEDIUM,
    message: 'Promotional language detected',
  },
  {
    pattern: /\b(earn\s*money|work\s*from\s*home|investment\s*opportunity|get\s*rich|mlm)\b/gi,
    severity: ValidationSeverity.HIGH,
    message: 'Suspicious promotional content',
  },
];

export function checkSpamPatterns(content: string): ContentViolation[] {
  const violations: ContentViolation[] = [];

  for (const rule of PROMOTIONAL_PATTERNS) {
    try {
      const matches = getMatchesWithPositions(content, rule.pattern);
      matches.forEach(({ match, index }) => {
        violations.push({
          type: ViolationType.PROMOTIONAL,
          severity: rule.severity,
          message: rule.message,
          match,
          position: index,
        });
      });
    } catch (error: unknown) {
      logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Promotional pattern error');
    }
  }

  try {
    const repetitiveMatches = getMatchesWithPositions(content, /(.{3,})\1{2,}/g);
    repetitiveMatches.forEach(({ match, index }) => {
      violations.push({
        type: ViolationType.REPETITIVE,
        severity: ValidationSeverity.MEDIUM,
        message: 'Repetitive content detected',
        match,
        position: index,
        suggestion: 'Avoid repeating the same text multiple times',
      });
    });
  } catch (error: unknown) {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Repetitive pattern error');
  }

  try {
    const length = content.length;
    if (length > 0) {
      const uppercaseCount = (content.match(/[A-Z]/g) || []).length;
      const capsRatio = uppercaseCount / length;

      if (capsRatio > 0.7 && length > 20) {
        violations.push({
          type: ViolationType.SPAM,
          severity: ValidationSeverity.MEDIUM,
          message: 'Excessive use of capital letters',
          match: content,
          position: 0,
          suggestion: 'Please avoid writing in all capitals',
        });
      }
    }
  } catch (error: unknown) {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Caps ratio error');
  }

  return violations;
}
