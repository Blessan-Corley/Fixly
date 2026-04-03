// Phase 2: Added shared integration auth helpers with a canonical CSRF test token.
export const TEST_CSRF_TOKEN = 'test-csrf-token-for-integration-tests';

type TestRole = 'hirer' | 'fixer' | 'admin';

export function createTestSession(role: TestRole = 'hirer') {
  return {
    user: {
      id: `test-user-${role}-id`,
      email: `test-${role}@example.com`,
      role,
      csrfToken: TEST_CSRF_TOKEN,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}
