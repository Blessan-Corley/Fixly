import { logger } from '@/lib/logger';
import {
  BLOCK_SCORE_THRESHOLD,
  VIOLATION_LOG_TTL_SECONDS,
  VIOLATION_SUMMARY_TTL_SECONDS,
  type ContentValidationResult,
  type ContentViolation,
  type SkillInput,
  type ValidationContext,
  type ViolationLogEntry,
  type ViolationSummary,
  type ViolationTypeValue,
} from '@/lib/validations/content/content.types';
import {
  generateCacheKey,
  generateCleanedContent,
  generateSuggestions,
  trimCache,
} from '@/lib/validations/content/reporters';
import { checkContextViolations, getValidationPolicy, normalizeContent, normalizeContextName, shouldBlockViolation } from '@/lib/validations/content/rules/policy';
import { checkProfanity } from '@/lib/validations/content/rules/profanity';
import { checkSensitiveInfo } from '@/lib/validations/content/rules/safety';
import { checkSpamPatterns } from '@/lib/validations/content/rules/spam';

export class ContentValidator {
  static violationCache: Map<string, ContentValidationResult> = new Map();

  static async validateContent(
    contentInput: unknown,
    context: ValidationContext = 'comment',
    userId: string | null = null
  ): Promise<ContentValidationResult> {
    const content = normalizeContent(contentInput);
    const normalizedContext = normalizeContextName(context);
    const policy = getValidationPolicy(normalizedContext);

    const cacheKey = this.generateCacheKey(content, normalizedContext);
    const cached = this.violationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const violations: ContentViolation[] = [
      ...(policy.allowSensitiveInfo ? [] : checkSensitiveInfo(content)),
      ...checkProfanity(content),
      ...checkSpamPatterns(content),
      ...checkContextViolations(content, normalizedContext),
    ];

    const score = violations.reduce((total, violation) => total + violation.severity, 0);
    const cleanedContent = this.generateCleanedContent(content, violations);
    const suggestions = this.generateSuggestions(violations);
    const blockedViolations = violations.filter((violation) =>
      shouldBlockViolation(violation, policy)
    );

    const result: ContentValidationResult = {
      isValid: blockedViolations.length === 0 && score < BLOCK_SCORE_THRESHOLD,
      violations,
      score,
      cleanedContent,
      suggestions,
    };

    this.violationCache.set(cacheKey, result);
    trimCache(this.violationCache);

    if (userId && violations.length > 0) {
      await this.logUserViolation(userId, content, violations);
    }

    return result;
  }

  static generateCleanedContent(content: string, violations: ContentViolation[]): string {
    return generateCleanedContent(content, violations);
  }

  static generateSuggestions(violations: ContentViolation[]): string[] {
    return generateSuggestions(violations);
  }

  static generateCacheKey(content: string, context: ValidationContext): string {
    return generateCacheKey(content, context);
  }

  static async logUserViolation(
    userId: string,
    content: string,
    violations: ContentViolation[]
  ): Promise<void> {
    try {
      // Dynamic import keeps lib/redis out of the client bundle — this function is
      // only called server-side (when userId is provided from an API route or server action).
      const { redisUtils } = await import('@/lib/redis');

      const key = `content_violations:${userId}`;
      const summaryKey = `content_violation_summary:${userId}`;
      const payload: ViolationLogEntry = {
        content: content.substring(0, 100),
        violations: violations.map((violation) => ({
          type: violation.type,
          severity: violation.severity,
          message: violation.message,
        })),
        timestamp: Date.now(),
      };

      await redisUtils.setex(
        `${key}:${Date.now()}`,
        VIOLATION_LOG_TTL_SECONDS,
        JSON.stringify(payload)
      );

      const existingSummary = await redisUtils.get<ViolationSummary | string | null>(summaryKey);
      const parsedSummary =
        typeof existingSummary === 'string'
          ? (() => {
              try {
                return JSON.parse(existingSummary) as ViolationSummary;
              } catch {
                return null;
              }
            })()
          : existingSummary;

      const recentTypes = Array.from(
        new Set([
          ...(Array.isArray(parsedSummary?.recentTypes) ? parsedSummary.recentTypes : []),
          ...violations.map((violation) => violation.type),
        ])
      ).slice(-10) as ViolationTypeValue[];

      const nextSummary: ViolationSummary = {
        count: (parsedSummary?.count || 0) + 1,
        lastViolationAt: Date.now(),
        recentTypes,
      };

      await redisUtils.setex(
        summaryKey,
        VIOLATION_SUMMARY_TTL_SECONDS,
        JSON.stringify(nextSummary)
      );
    } catch (error: unknown) {
      logger.error({ error }, 'Error logging user violation');
    }
  }

  static async validateUsername(
    username: unknown,
    userId: string | null = null
  ): Promise<ContentValidationResult> {
    return this.validateContent(username, 'profile', userId);
  }

  static async validateBio(
    bio: unknown,
    userId: string | null = null
  ): Promise<ContentValidationResult> {
    return this.validateContent(bio, 'profile', userId);
  }

  static async validateSkills(
    skills: SkillInput[],
    userId: string | null = null
  ): Promise<Array<{ skill: string } & ContentValidationResult>> {
    const results: Array<{ skill: string } & ContentValidationResult> = [];

    for (const skill of skills || []) {
      const skillName = typeof skill === 'string' ? skill : skill?.name || '';
      const result = await this.validateContent(skillName, 'profile', userId);
      if (!result.isValid) {
        results.push({
          skill: skillName,
          ...result,
        });
      }
    }

    return results;
  }
}
