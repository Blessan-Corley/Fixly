import { after } from 'next/server';

import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';

type SignupEventData = {
  userId: string;
  email: string;
  name: string;
  role: 'fixer' | 'hirer';
};

export async function validateSignupContent(
  name: string,
  username: string,
  skills: string[] | undefined
): Promise<{ valid: true } | { valid: false; message: string; suggestions?: string[] }> {
  const { ContentValidator } = await import('@/lib/validations/content');

  const nameResult = await ContentValidator.validateContent(name, 'profile');
  if (!nameResult.isValid) {
    return {
      valid: false,
      message: nameResult.violations[0]?.message || 'Invalid name',
      suggestions: nameResult.suggestions,
    };
  }

  const usernameResult = await ContentValidator.validateUsername(username);
  if (!usernameResult.isValid) {
    return {
      valid: false,
      message: usernameResult.violations[0]?.message || 'Invalid username',
      suggestions: usernameResult.suggestions,
    };
  }

  if (Array.isArray(skills) && skills.length > 0) {
    const invalidSkills = await ContentValidator.validateSkills(skills);
    if (invalidSkills.length > 0) {
      return {
        valid: false,
        message: invalidSkills[0]?.violations[0]?.message || 'Invalid skills',
        suggestions: invalidSkills[0]?.suggestions,
      };
    }
  }

  return { valid: true };
}

export function scheduleSignupEvent(user: {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
}): void {
  if (!user.id || !user.email || !user.name) return;
  const data: SignupEventData = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role === 'fixer' ? 'fixer' : 'hirer',
  };
  after(async () => {
    try {
      await inngest.send({ name: 'user/signup.completed', data });
    } catch (err: unknown) {
      logger.warn('Failed to send signup.completed event:', err);
    }
  });
}
