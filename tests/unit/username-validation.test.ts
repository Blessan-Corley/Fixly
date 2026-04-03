import {
  normalizeUsername,
  RESERVED_USERNAMES,
  validateUsernameFormat,
} from '@/lib/validations/username';

describe('username validation rules', () => {
  it('normalizes to lowercase trimmed usernames', () => {
    expect(normalizeUsername('  User_Name  ')).toBe('user_name');
  });

  it('rejects reserved usernames', () => {
    expect(RESERVED_USERNAMES.has('admin')).toBe(true);
    expect(validateUsernameFormat('admin')).toContain('reserved');
  });

  it('rejects usernames with invalid structure', () => {
    expect(validateUsernameFormat('')).toContain('required');
    expect(validateUsernameFormat('ab')).toContain('between 3 and 20');
    expect(validateUsernameFormat('_bad')).toContain('underscore');
    expect(validateUsernameFormat('bad__name')).toContain('underscore');
    expect(validateUsernameFormat('123456')).toContain('numbers');
    expect(validateUsernameFormat('bad-name')).toContain('lowercase letters');
  });

  it('accepts valid usernames', () => {
    expect(validateUsernameFormat('fixer_name_1')).toBeNull();
    expect(validateUsernameFormat('hirer123')).toBeNull();
  });
});
