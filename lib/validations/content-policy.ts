import {
  ContentValidator,
  ViolationType,
  type ContentValidationResult,
  type ContentViolation,
} from './content-validator';

export type ContentPolicyContext =
  | 'general'
  | 'job_posting'
  | 'job_draft'
  | 'job_description'
  | 'job_application'
  | 'comment'
  | 'review'
  | 'dispute'
  | 'portfolio'
  | 'job_media'
  | 'notification'
  | 'profile'
  | 'private_message';

export type ModeratedContentResult = {
  allowed: boolean;
  content: string;
  message: string | null;
  violations: ContentViolation[];
  suggestions: string[];
  validation: ContentValidationResult;
};

type ModerationOptions = {
  context: ContentPolicyContext;
  userId?: string | null;
  fieldLabel?: string;
  allowRanges?: Array<{ startIndex: number; endIndex: number }>;
};

const VIOLATION_MESSAGES: Partial<Record<string, string>> = {
  [ViolationType.PHONE_NUMBER]:
    'contains phone numbers or direct contact details. Share that only in private messaging.',
  [ViolationType.EMAIL_ADDRESS]:
    'contains email addresses or disguised contact details. Share that only in private messaging.',
  [ViolationType.SOCIAL_MEDIA]:
    'contains social handles or contact instructions. Share that only in private messaging.',
  [ViolationType.EXTERNAL_LINK]: 'contains external links, which are not allowed here.',
  [ViolationType.ABUSE]: 'contains abusive or inappropriate language.',
  [ViolationType.PROFANITY]: 'contains abusive or inappropriate language.',
  [ViolationType.SPAM]: 'contains spam-like content.',
  [ViolationType.PROMOTIONAL]: 'contains suspicious promotional content.',
};

function toFieldLabel(fieldLabel?: string): string {
  return fieldLabel?.trim() || 'Content';
}

function maskAllowedRanges(
  content: string,
  allowRanges: Array<{ startIndex: number; endIndex: number }> | undefined
): string {
  if (!Array.isArray(allowRanges) || allowRanges.length === 0) {
    return content;
  }

  const characters = content.split('');

  for (const range of allowRanges) {
    const startIndex = Number(range?.startIndex);
    const endIndex = Number(range?.endIndex);

    if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex)) {
      continue;
    }

    const safeStart = Math.max(0, Math.min(content.length, startIndex));
    const safeEnd = Math.max(safeStart, Math.min(content.length, endIndex));

    for (let index = safeStart; index < safeEnd; index += 1) {
      characters[index] = ' ';
    }
  }

  return characters.join('');
}

function buildModerationMessage(
  fieldLabel: string,
  violations: ContentViolation[],
  suggestions: string[]
): string {
  const firstViolation = violations[0];
  const baseMessage =
    (firstViolation && VIOLATION_MESSAGES[firstViolation.type]) ||
    firstViolation?.message ||
    'contains prohibited content.';
  const suggestion = suggestions[0];

  if (!suggestion) {
    return `${fieldLabel} ${baseMessage}`;
  }

  return `${fieldLabel} ${baseMessage} ${suggestion}`;
}

export async function moderateUserGeneratedContent(
  content: string,
  options: ModerationOptions
): Promise<ModeratedContentResult> {
  const contentForValidation = maskAllowedRanges(content, options.allowRanges);
  const validation = await ContentValidator.validateContent(
    contentForValidation,
    options.context,
    options.userId ?? null
  );
  const fieldLabel = toFieldLabel(options.fieldLabel);

  if (validation.isValid) {
    return {
      allowed: true,
      content,
      message: null,
      violations: validation.violations,
      suggestions: validation.suggestions,
      validation,
    };
  }

  return {
    allowed: false,
    content,
    message: buildModerationMessage(fieldLabel, validation.violations, validation.suggestions),
    violations: validation.violations,
    suggestions: validation.suggestions,
    validation,
  };
}
