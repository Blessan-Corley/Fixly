import { vi } from 'vitest';
vi.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    exists: vi.fn(),
  },
}));

import User from '@/models/User';
import { UsernameService } from '@/services/auth/usernameService';

describe('UsernameService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a normalized base username from the email prefix', async () => {
    (User.exists as jest.Mock).mockResolvedValue(false);

    const username = await UsernameService.generateUniqueUsername('John.Doe+test@example.com');

    expect(username).toBe('johndoetest');
    expect(User.exists).toHaveBeenCalledWith({ username: 'johndoetest' });
  });

  it('adds a sequential numeric suffix when the base username already exists', async () => {
    (User.exists as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const username = await UsernameService.generateUniqueUsername('existing@example.com');

    expect(username).toBe('existing1');
  });

  it('validates allowed usernames and rejects invalid ones', () => {
    expect(UsernameService.validateUsername('valid_name')).toEqual({ valid: true });
    expect(UsernameService.validateUsername('Admin')).toEqual({
      valid: false,
      error: 'This username is reserved',
    });
  });
});
