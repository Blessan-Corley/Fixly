import crypto from 'crypto';

import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';

const MODERATION_CACHE_TTL_SECONDS = 60 * 60;

export type ModerationSeverity = 'low' | 'medium' | 'high';

export type ModerationResult = {
  approved: boolean;
  violations: string[];
  suggestions: string[];
  severity: ModerationSeverity;
  message: string | null;
};

type FieldModerationResult = {
  approved: boolean;
  message: string | null;
  violations: string[];
  suggestions: string[];
};

function buildCacheKey(parts: string[]): string {
  const hash = crypto.createHash('sha256').update(parts.join('|')).digest('hex');
  return `job_moderation:${hash}`;
}

function normalizeViolationMessages(violations: unknown[]): string[] {
  return violations
    .map((violation) => {
      if (!violation || typeof violation !== 'object') {
        return '';
      }

      const candidate = violation as { message?: unknown; type?: unknown };
      if (typeof candidate.message === 'string' && candidate.message.trim()) {
        return candidate.message.trim();
      }
      if (typeof candidate.type === 'string' && candidate.type.trim()) {
        return candidate.type.trim();
      }
      return '';
    })
    .filter(Boolean);
}

function resolveSeverity(violations: string[]): ModerationSeverity {
  if (violations.length === 0) {
    return 'low';
  }

  const joined = violations.join(' ').toLowerCase();
  if (
    joined.includes('phone') ||
    joined.includes('email') ||
    joined.includes('social') ||
    joined.includes('abuse') ||
    joined.includes('profanity') ||
    joined.includes('spam') ||
    joined.includes('link')
  ) {
    return 'high';
  }

  return violations.length > 1 ? 'high' : 'medium';
}

async function readCachedModeration(cacheKey: string): Promise<ModerationResult | null> {
  try {
    const cached = await redisUtils.get<ModerationResult>(cacheKey);
    if (cached && typeof cached === 'object') {
      return cached;
    }
  } catch (error: unknown) {
    logger.warn({ error, cacheKey }, 'Job moderation cache read failed');
  }

  return null;
}

async function writeCachedModeration(cacheKey: string, result: ModerationResult): Promise<void> {
  try {
    await redisUtils.set(cacheKey, result, MODERATION_CACHE_TTL_SECONDS);
  } catch (error: unknown) {
    logger.warn({ error, cacheKey }, 'Job moderation cache write failed');
  }
}

async function moderateField(
  value: string,
  fieldLabel: string,
  userId?: string
): Promise<FieldModerationResult> {
  const moderation = await moderateUserGeneratedContent(value, {
    context: 'job_posting',
    fieldLabel,
    userId,
  });

  return {
    approved: moderation.allowed,
    message: moderation.message,
    violations: normalizeViolationMessages(moderation.violations),
    suggestions: moderation.suggestions,
  };
}

export async function moderateJobContent(
  title: string,
  description: string,
  userId?: string
): Promise<ModerationResult> {
  const cacheKey = buildCacheKey([
    'job-content',
    title.trim().toLowerCase(),
    description.trim().toLowerCase(),
  ]);
  const cached = await readCachedModeration(cacheKey);
  if (cached) {
    return cached;
  }

  const [titleResult, descriptionResult] = await Promise.all([
    moderateField(title, 'Job title', userId),
    moderateField(description, 'Job description', userId),
  ]);

  const violations = [...titleResult.violations, ...descriptionResult.violations];
  const suggestions = [...titleResult.suggestions, ...descriptionResult.suggestions].filter(Boolean);
  const result: ModerationResult = {
    approved: titleResult.approved && descriptionResult.approved,
    message: titleResult.message || descriptionResult.message,
    violations,
    suggestions,
    severity: resolveSeverity(violations),
  };

  await writeCachedModeration(cacheKey, result);
  return result;
}

export async function moderateJobSkills(
  skills: string[],
  userId?: string
): Promise<ModerationResult> {
  if (skills.length === 0) {
    return {
      approved: true,
      message: null,
      violations: [],
      suggestions: [],
      severity: 'low',
    };
  }

  const cacheKey = buildCacheKey(['job-skills', ...skills.map((skill) => skill.trim().toLowerCase())]);
  const cached = await readCachedModeration(cacheKey);
  if (cached) {
    return cached;
  }

  const skillResults = await Promise.all(
    skills.map((skill) => moderateField(skill, 'Required skill', userId))
  );
  const firstFailure = skillResults.find((result) => !result.approved) || null;
  const violations = skillResults.flatMap((result) => result.violations);
  const suggestions = skillResults.flatMap((result) => result.suggestions).filter(Boolean);
  const result: ModerationResult = {
    approved: skillResults.every((result) => result.approved),
    message: firstFailure?.message || null,
    violations,
    suggestions,
    severity: resolveSeverity(violations),
  };

  await writeCachedModeration(cacheKey, result);
  return result;
}
