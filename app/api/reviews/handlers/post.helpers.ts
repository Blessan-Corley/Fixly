import { respond } from '@/lib/api';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';

import { sanitizeTextList } from './shared';

type AttachmentInput = {
  type?: unknown;
  url?: unknown;
  filename?: unknown;
  description?: unknown;
};

const VALID_ATTACHMENT_TYPES = ['image', 'document'] as const;
type AttachmentType = (typeof VALID_ATTACHMENT_TYPES)[number];

type NormalizedAttachment = {
  type: AttachmentType;
  url: string;
  filename?: string;
  description?: string;
};

export function normalizeAttachments(
  attachments: unknown
): NormalizedAttachment[] {
  if (!Array.isArray(attachments)) return [];
  return (attachments as AttachmentInput[])
    .slice(0, 5)
    .filter(
      (item): item is AttachmentInput & { type: AttachmentType; url: string } =>
        item != null &&
        typeof item.url === 'string' &&
        VALID_ATTACHMENT_TYPES.includes(item.type as AttachmentType)
    )
    .map((item) => ({
      type: item.type as AttachmentType,
      url: item.url as string,
      filename: typeof item.filename === 'string' ? item.filename.slice(0, 120) : undefined,
      description:
        typeof item.description === 'string' ? item.description.slice(0, 500) : undefined,
    }));
}

export async function moderateReviewText(
  fields: Array<{ label: string; value: string }>,
  userId: string
): Promise<Response | null> {
  for (const field of fields) {
    const moderation = await moderateUserGeneratedContent(field.value, {
      context: 'review',
      fieldLabel: field.label,
      userId,
    });
    if (!moderation.allowed) {
      return respond(
        {
          message: moderation.message,
          violations: moderation.violations,
          suggestions: moderation.suggestions,
        },
        400
      );
    }
  }
  return null;
}

export async function moderateReviewLists(
  lists: Array<{ label: string; values: string[] }>,
  userId: string
): Promise<Response | null> {
  for (const list of lists) {
    for (const item of list.values) {
      const moderation = await moderateUserGeneratedContent(item, {
        context: 'review',
        fieldLabel: list.label,
        userId,
      });
      if (!moderation.allowed) {
        return respond(
          {
            message: moderation.message,
            violations: moderation.violations,
            suggestions: moderation.suggestions,
          },
          400
        );
      }
    }
  }
  return null;
}

export function buildModerationTextFields(
  title: string,
  comment: string
): Array<{ label: string; value: string }> {
  return [
    { label: 'Review title', value: title.trim() },
    { label: 'Review comment', value: comment.trim() },
  ];
}

export function buildModerationListFields(
  pros: string[],
  cons: string[]
): Array<{ label: string; values: string[] }> {
  return [
    { label: 'Review pros', values: sanitizeTextList(pros, 10, 200) },
    { label: 'Review cons', values: sanitizeTextList(cons, 10, 200) },
  ];
}
