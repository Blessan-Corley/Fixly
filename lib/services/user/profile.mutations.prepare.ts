import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';

import type { ProfileUpdateBody, UpdatePayload, UserDocument } from './profile.schema';
import {
  isPlainObject,
  toNumber,
  toTrimmedString,
} from './profile.schema';

type MutationError = {
  body: Record<string, unknown>;
  status: number;
};

export type PreparedUpdatesResult =
  | { updates: UpdatePayload; error?: never }
  | { updates?: never; error: MutationError };

export async function prepareProfileUpdates(
  parsedBody: ProfileUpdateBody,
  user: UserDocument,
  sessionUserId: string
): Promise<PreparedUpdatesResult> {
  const updates: UpdatePayload = {};

  if (parsedBody.name !== undefined) {
    const normalizedName = toTrimmedString(parsedBody.name);
    if (!normalizedName || normalizedName.length < 2) {
      return { error: { body: { message: 'Name must be at least 2 characters' }, status: 400 } };
    }

    const moderation = await moderateUserGeneratedContent(normalizedName, {
      context: 'profile',
      fieldLabel: 'Name',
      userId: sessionUserId,
    });
    if (!moderation.allowed) {
      return {
        error: {
          body: {
            message: moderation.message,
            violations: moderation.violations,
            suggestions: moderation.suggestions,
          },
          status: 400,
        },
      };
    }

    updates.name = normalizedName;
  }

  if (parsedBody.bio !== undefined) {
    const normalizedBio = toTrimmedString(parsedBody.bio);
    if (normalizedBio && normalizedBio.length > 500) {
      return {
        error: { body: { message: 'Bio must be less than 500 characters' }, status: 400 },
      };
    }

    if (normalizedBio) {
      const moderation = await moderateUserGeneratedContent(normalizedBio, {
        context: 'profile',
        fieldLabel: 'Bio',
        userId: sessionUserId,
      });
      if (!moderation.allowed) {
        return {
          error: {
            body: {
              message: moderation.message,
              violations: moderation.violations,
              suggestions: moderation.suggestions,
            },
            status: 400,
          },
        };
      }
    }

    updates.bio = normalizedBio ?? '';
  }

  if (parsedBody.location !== undefined) {
    if (!isPlainObject(parsedBody.location)) {
      return { error: { body: { message: 'Invalid location format' }, status: 400 } };
    }
    updates.location = parsedBody.location;
  }

  if (parsedBody.skills !== undefined && user.role === 'fixer') {
    if (!Array.isArray(parsedBody.skills)) {
      return { error: { body: { message: 'Skills must be an array' }, status: 400 } };
    }

    const normalizedSkills = parsedBody.skills
      .map((skill) => toTrimmedString(skill))
      .filter((skill): skill is string => Boolean(skill))
      .slice(0, 50);

    for (const skill of normalizedSkills) {
      const moderation = await moderateUserGeneratedContent(skill, {
        context: 'profile',
        fieldLabel: 'Skill',
        userId: sessionUserId,
      });
      if (!moderation.allowed) {
        return {
          error: {
            body: {
              message: moderation.message,
              violations: moderation.violations,
              suggestions: moderation.suggestions,
            },
            status: 400,
          },
        };
      }
    }

    updates.skills = Array.from(new Set(normalizedSkills));
  }

  if (parsedBody.preferences !== undefined) {
    if (!isPlainObject(parsedBody.preferences)) {
      return { error: { body: { message: 'Invalid preferences format' }, status: 400 } };
    }
    updates.preferences = parsedBody.preferences;
  }

  if (parsedBody.profilePhoto !== undefined) {
    if (parsedBody.profilePhoto !== null && !isPlainObject(parsedBody.profilePhoto)) {
      return { error: { body: { message: 'Invalid profile photo format' }, status: 400 } };
    }
    updates.profilePhoto = (parsedBody.profilePhoto as Record<string, unknown> | null) ?? null;
  }

  if (parsedBody.availableNow !== undefined) {
    updates.availableNow = Boolean(parsedBody.availableNow);
  }

  if (parsedBody.serviceRadius !== undefined) {
    const serviceRadius = toNumber(parsedBody.serviceRadius);
    if (serviceRadius === null || serviceRadius < 1 || serviceRadius > 50) {
      return {
        error: { body: { message: 'Service radius must be between 1 and 50 km' }, status: 400 },
      };
    }
    updates.serviceRadius = serviceRadius;
  }

  if (Object.keys(updates).length === 0) {
    return { error: { body: { message: 'No valid updates provided' }, status: 400 } };
  }

  return { updates };
}
