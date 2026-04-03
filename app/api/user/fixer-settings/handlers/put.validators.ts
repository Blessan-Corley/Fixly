import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';

import { isPlainObject, normalizePortfolioItems, toBoolean, toFiniteNumber, toNullableNumber } from './put.helpers';
import {
  TIME_REGEX,
  VALID_RESPONSE_TIMES,
  VALID_WORKING_DAYS,
  type FixerSettingsBody,
  type ValidatedFixerSettings,
  type WorkingHoursInput,
} from './put.types';
import { toTrimmedString } from './shared';

export async function validateFixerSettings(
  parsedBody: FixerSettingsBody,
  userId: string
): Promise<ValidatedFixerSettings> {
  const errors: string[] = [];

  // --- serviceRadius ---
  const serviceRadiusNumber =
    parsedBody.serviceRadius !== undefined ? toFiniteNumber(parsedBody.serviceRadius) : undefined;
  if (parsedBody.serviceRadius !== undefined) {
    if (
      serviceRadiusNumber === null ||
      serviceRadiusNumber === undefined ||
      serviceRadiusNumber < 1 ||
      serviceRadiusNumber > 100
    ) {
      errors.push('Service radius must be between 1 and 100 km');
    }
  }

  // --- hourlyRate ---
  const hourlyRateNumber = toNullableNumber(parsedBody.hourlyRate);
  if (parsedBody.hourlyRate !== undefined) {
    if (
      hourlyRateNumber === undefined ||
      (hourlyRateNumber === null &&
        parsedBody.hourlyRate !== null &&
        !(typeof parsedBody.hourlyRate === 'string' && parsedBody.hourlyRate.trim().length === 0))
    ) {
      errors.push('Invalid hourly rate');
    } else if (hourlyRateNumber !== null && (hourlyRateNumber < 0 || hourlyRateNumber > 10000)) {
      errors.push('Hourly rate must be between 0 and 10000');
    }
  }

  // --- minimumJobValue ---
  const minimumJobValueNumber = toNullableNumber(parsedBody.minimumJobValue);
  if (parsedBody.minimumJobValue !== undefined) {
    if (
      minimumJobValueNumber === undefined ||
      (minimumJobValueNumber === null &&
        parsedBody.minimumJobValue !== null &&
        !(
          typeof parsedBody.minimumJobValue === 'string' &&
          parsedBody.minimumJobValue.trim().length === 0
        ))
    ) {
      errors.push('Invalid minimum job value');
    } else if (minimumJobValueNumber !== null && minimumJobValueNumber < 0) {
      errors.push('Minimum job value must be 0 or greater');
    }
  }

  // --- maximumJobValue ---
  const maximumJobValueNumber = toNullableNumber(parsedBody.maximumJobValue);
  if (parsedBody.maximumJobValue !== undefined) {
    if (
      maximumJobValueNumber === undefined ||
      (maximumJobValueNumber === null &&
        parsedBody.maximumJobValue !== null &&
        !(
          typeof parsedBody.maximumJobValue === 'string' &&
          parsedBody.maximumJobValue.trim().length === 0
        ))
    ) {
      errors.push('Invalid maximum job value');
    } else if (maximumJobValueNumber !== null && maximumJobValueNumber < 0) {
      errors.push('Maximum job value must be 0 or greater');
    }
  }

  if (
    minimumJobValueNumber !== undefined &&
    maximumJobValueNumber !== undefined &&
    minimumJobValueNumber !== null &&
    maximumJobValueNumber !== null &&
    minimumJobValueNumber > maximumJobValueNumber
  ) {
    errors.push('Minimum job value cannot be greater than maximum job value');
  }

  // --- responseTime ---
  const responseTime =
    parsedBody.responseTime !== undefined ? toTrimmedString(parsedBody.responseTime) : null;
  if (parsedBody.responseTime !== undefined) {
    if (!responseTime || !VALID_RESPONSE_TIMES.has(responseTime)) {
      errors.push('Invalid response time');
    }
  }

  // --- workingHours ---
  let workingHours: { start: string; end: string } | undefined;
  if (parsedBody.workingHours !== undefined) {
    if (!isPlainObject(parsedBody.workingHours)) {
      errors.push('Working hours must be an object');
    } else {
      const input = parsedBody.workingHours as WorkingHoursInput;
      const start = toTrimmedString(input.start);
      const end = toTrimmedString(input.end);

      if (!start || !end) {
        errors.push('Both start and end times are required');
      } else if (!TIME_REGEX.test(start) || !TIME_REGEX.test(end)) {
        errors.push('Invalid time format. Use HH:MM format');
      } else {
        workingHours = { start, end };
      }
    }
  }

  // --- workingDays ---
  let workingDays: string[] | undefined;
  if (parsedBody.workingDays !== undefined) {
    if (!Array.isArray(parsedBody.workingDays) || parsedBody.workingDays.length === 0) {
      errors.push('At least one working day must be selected');
    } else {
      const normalizedDays = parsedBody.workingDays
        .map((day) => toTrimmedString(day)?.toLowerCase() ?? '')
        .filter((day) => day.length > 0);
      const invalidDays = normalizedDays.filter((day) => !VALID_WORKING_DAYS.has(day));

      if (invalidDays.length > 0) {
        errors.push(`Invalid working days: ${invalidDays.join(', ')}`);
      } else {
        workingDays = Array.from(new Set(normalizedDays));
      }
    }
  }

  // --- skills ---
  let skills: string[] | undefined;
  if (parsedBody.skills !== undefined) {
    if (!Array.isArray(parsedBody.skills)) {
      errors.push('Skills must be an array');
    } else if (parsedBody.skills.length === 0) {
      errors.push('At least one skill is required for fixers');
    } else if (parsedBody.skills.length > 20) {
      errors.push('Maximum 20 skills allowed');
    } else {
      const normalizedSkills = parsedBody.skills
        .map((skill) => toTrimmedString(skill)?.toLowerCase() ?? '')
        .filter((skill) => skill.length > 0 && skill.length <= 50);

      if (normalizedSkills.length !== parsedBody.skills.length) {
        errors.push('All skills must be valid strings (1-50 characters)');
      } else {
        for (const skill of normalizedSkills) {
          const moderation = await moderateUserGeneratedContent(skill, {
            context: 'profile',
            fieldLabel: 'Skill',
            userId,
          });
          if (!moderation.allowed) {
            errors.push(moderation.message ?? 'Invalid skill content');
            break;
          }
        }
        if (errors.length === 0) {
          skills = Array.from(new Set(normalizedSkills));
        }
      }
    }
  }

  // --- portfolio ---
  let portfolio: ReturnType<typeof normalizePortfolioItems> | undefined;
  if (parsedBody.portfolio !== undefined) {
    const normalizedPortfolio = normalizePortfolioItems(parsedBody.portfolio);
    if (!normalizedPortfolio) {
      errors.push('Portfolio must be an array');
    } else if (normalizedPortfolio.length > 10) {
      errors.push('Maximum 10 portfolio items allowed');
    } else {
      let portfolioValid = true;
      outer: for (const item of normalizedPortfolio) {
        for (const [key, value] of Object.entries(item)) {
          if (key === 'images' || value == null) continue;

          if (Array.isArray(value)) {
            for (const entry of value) {
              if (typeof entry !== 'string' || !entry.trim()) continue;
              const moderation = await moderateUserGeneratedContent(entry.trim(), {
                context: 'portfolio',
                fieldLabel: 'Portfolio item',
                userId,
              });
              if (!moderation.allowed) {
                errors.push(moderation.message ?? 'Invalid portfolio content');
                portfolioValid = false;
                break outer;
              }
            }
          } else if (typeof value === 'string' && value.trim()) {
            const moderation = await moderateUserGeneratedContent(value.trim(), {
              context: 'portfolio',
              fieldLabel: 'Portfolio item',
              userId,
            });
            if (!moderation.allowed) {
              errors.push(moderation.message ?? 'Invalid portfolio content');
              portfolioValid = false;
              break outer;
            }
          }
        }
      }
      if (portfolioValid) {
        portfolio = normalizedPortfolio;
      }
    }
  }

  // --- booleans ---
  const availableNow =
    parsedBody.availableNow !== undefined ? toBoolean(parsedBody.availableNow) : undefined;
  if (parsedBody.availableNow !== undefined && availableNow === null) {
    errors.push('availableNow must be a boolean');
  }

  const autoApply =
    parsedBody.autoApply !== undefined ? toBoolean(parsedBody.autoApply) : undefined;
  if (parsedBody.autoApply !== undefined && autoApply === null) {
    errors.push('autoApply must be a boolean');
  }

  const emergencyAvailable =
    parsedBody.emergencyAvailable !== undefined
      ? toBoolean(parsedBody.emergencyAvailable)
      : undefined;
  if (parsedBody.emergencyAvailable !== undefined && emergencyAvailable === null) {
    errors.push('emergencyAvailable must be a boolean');
  }

  return {
    errors,
    availableNow,
    serviceRadiusNumber,
    hourlyRateNumber,
    minimumJobValueNumber,
    maximumJobValueNumber,
    responseTime,
    workingHours,
    workingDays,
    skills,
    portfolio: portfolio ?? undefined,
    autoApply,
    emergencyAvailable,
  };
}
