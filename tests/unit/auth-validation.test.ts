import {
  passwordSchema,
  signupApiSchema,
  signupStep4Schema,
  usernameSchema,
} from '@/lib/validations/auth';

describe('auth validation schemas', () => {
  it('enforces strong password requirements', () => {
    expect(passwordSchema.safeParse('StrongPass1!').success).toBe(true);
    expect(passwordSchema.safeParse('weak').success).toBe(false);
    expect(passwordSchema.safeParse('nouppercase1!').success).toBe(false);
    expect(passwordSchema.safeParse('NOLOWERCASE1!').success).toBe(false);
    expect(passwordSchema.safeParse('NoNumber!').success).toBe(false);
    expect(passwordSchema.safeParse('NoSpecial1').success).toBe(false);
  });

  it('enforces username format and reserved words', () => {
    expect(usernameSchema.safeParse('good_name_1').success).toBe(true);
    expect(usernameSchema.safeParse('Admin').success).toBe(false);
    expect(usernameSchema.safeParse('admin').success).toBe(false);
    expect(usernameSchema.safeParse('bad__name').success).toBe(false);
    expect(usernameSchema.safeParse('_badname').success).toBe(false);
    expect(usernameSchema.safeParse('123456').success).toBe(false);
  });

  it('requires fixer skill selection and terms acceptance on step 4', () => {
    const invalidFixer = signupStep4Schema.safeParse({
      address: { formatted: 'Test Address' },
      role: 'fixer',
      skills: ['Plumbing', 'Electrical'],
      termsAccepted: true,
    });

    const invalidTerms = signupStep4Schema.safeParse({
      address: { formatted: 'Test Address' },
      role: 'hirer',
      termsAccepted: false,
    });

    const validFixer = signupStep4Schema.safeParse({
      address: { formatted: 'Test Address' },
      role: 'fixer',
      skills: ['Plumbing', 'Electrical', 'Repairs'],
      termsAccepted: true,
    });

    expect(invalidFixer.success).toBe(false);
    expect(invalidTerms.success).toBe(false);
    expect(validFixer.success).toBe(true);
  });

  it('accepts google signup payloads without password when core profile fields are present', () => {
    const result = signupApiSchema.safeParse({
      authMethod: 'google',
      role: 'hirer',
      email: 'google-user@example.com',
      googleId: 'google-123',
      name: 'Google User',
      username: 'google_user',
      phone: '9876543210',
      termsAccepted: true,
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid auth methods in API signup payloads', () => {
    const result = signupApiSchema.safeParse({
      authMethod: 'phone',
      role: 'hirer',
      email: 'person@example.com',
      name: 'Person',
      username: 'person_1',
    });

    expect(result.success).toBe(false);
  });

  it('requires a valid 10-digit phone number in signupApiSchema', () => {
    const base = {
      authMethod: 'email',
      role: 'hirer',
      email: 'test@example.com',
      name: 'Test User',
      username: 'test_user_1',
      password: 'StrongPass1!',
    };

    // Missing phone — should fail
    expect(signupApiSchema.safeParse(base).success).toBe(false);

    // Too short — should fail
    expect(signupApiSchema.safeParse({ ...base, phone: '12345' }).success).toBe(false);

    // Valid 10-digit Indian number — should pass
    expect(signupApiSchema.safeParse({ ...base, phone: '9876543210' }).success).toBe(true);
  });

  it('rejects invalid role in signupApiSchema', () => {
    const result = signupApiSchema.safeParse({
      authMethod: 'email',
      role: 'admin',
      email: 'test@example.com',
      name: 'Test User',
      username: 'test_user_1',
      phone: '9876543210',
      password: 'StrongPass1!',
    });

    expect(result.success).toBe(false);
    const phoneError = result.error?.issues.find((i) => i.path.includes('role'));
    expect(phoneError).toBeDefined();
  });
});
