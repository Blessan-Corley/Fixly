import { normalizeUsername, validateUsernameFormat } from '../../lib/validations/username';
import User from '../../models/User';

export class UsernameService {
  static async generateUniqueUsername(email: string): Promise<string> {
    const base = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 12);

    if (!(await User.exists({ username: base }))) {
      return base;
    }

    for (let counter = 1; counter <= 9999; counter++) {
      const username = `${base}${counter}`;
      if (!(await User.exists({ username }))) {
        return username;
      }
    }

    return `${base}${Date.now().toString().slice(-6)}`;
  }

  static validateUsername(username: string): { valid: boolean; error?: string } {
    const normalized = normalizeUsername(username);
    const error = validateUsernameFormat(normalized);
    if (error) return { valid: false, error };

    return { valid: true };
  }
}
