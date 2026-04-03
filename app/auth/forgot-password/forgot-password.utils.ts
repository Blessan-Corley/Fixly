import type { PasswordStrength } from './forgot-password.types';

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { level: 0, text: '', color: 'gray' };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (password.length >= 12) score += 1;

  if (score <= 2) return { level: 1, text: 'Weak', color: 'red' };
  if (score <= 4) return { level: 2, text: 'Medium', color: 'yellow' };
  if (score <= 5) return { level: 3, text: 'Strong', color: 'green' };
  return { level: 4, text: 'Very Strong', color: 'green' };
}
