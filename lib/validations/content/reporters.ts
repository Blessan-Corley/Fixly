import {
  CACHE_LIMIT,
  ValidationSeverity,
  ViolationType,
  type ContentValidationResult,
  type ContentViolation,
  type ValidationContext,
} from '@/lib/validations/content/content.types';

export function generateCleanedContent(
  content: string,
  violations: ContentViolation[]
): string {
  let cleaned = content;

  for (const violation of violations) {
    if (violation.severity >= ValidationSeverity.HIGH) {
      cleaned = cleaned.replace(violation.match, '[REMOVED]');
    }
  }

  return cleaned.trim();
}

export function generateSuggestions(violations: ContentViolation[]): string[] {
  const suggestions = new Set<string>();

  violations.forEach((violation) => {
    if (violation.suggestion) {
      suggestions.add(violation.suggestion);
    }
  });

  const types = violations.map((violation) => violation.type);

  if (types.includes(ViolationType.PHONE_NUMBER) || types.includes(ViolationType.EMAIL_ADDRESS)) {
    suggestions.add(
      'Contact details are automatically shared in private messages after job assignment'
    );
  }

  if (types.includes(ViolationType.LOCATION_SHARING)) {
    suggestions.add(
      'Do not share precise addresses or map coordinates in public marketplace content'
    );
  }

  if (types.includes(ViolationType.PROFANITY) || types.includes(ViolationType.ABUSE)) {
    suggestions.add('Please maintain professional and respectful communication');
  }

  return Array.from(suggestions);
}

export function generateCacheKey(content: string, context: ValidationContext): string {
  const hash = content.split('').reduce((acc, char) => {
    const next = (acc << 5) - acc + char.charCodeAt(0);
    return next & next;
  }, 0);

  return `${context}:${hash}`;
}

export function trimCache(cache: Map<string, ContentValidationResult>): void {
  if (cache.size <= CACHE_LIMIT) {
    return;
  }

  const keysToDelete = cache.size - CACHE_LIMIT;
  const keys = Array.from(cache.keys()).slice(0, keysToDelete);
  keys.forEach((key) => cache.delete(key));
}
