import * as fs from 'fs';
import * as path from 'path';

import { encode } from 'next-auth/jwt';

// Load .env.local so the test secret matches the running dev server
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const SECRET =
  process.env.NEXTAUTH_SECRET ?? 'test-secret-123456789012345678901234567890';

async function createAuthState(
  role: 'hirer' | 'fixer',
  userId: string
): Promise<{ cookies: object[]; origins: object[] }> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 30 * 24 * 60 * 60;

  const jwt = await encode({
    token: {
      id: userId,
      sub: userId,
      email: `test-${role}@fixly-e2e.test`,
      name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      role,
      username: `test_${role}_e2e`,
      isRegistered: true,
      isNewUser: false,
      banned: false,
      isActive: true,
      deleted: false,
      authMethod: 'email',
      csrfToken: 'e2e-csrf-test-token',
      iat: now,
      exp: expiry,
    },
    secret: SECRET,
    maxAge: 30 * 24 * 60 * 60,
  });

  return {
    cookies: [
      {
        name: 'next-auth.session-token',
        value: jwt,
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        secure: false,
        expires: expiry,
      },
    ],
    origins: [],
  };
}

export default async function globalSetup(): Promise<void> {
  const authDir = path.join(process.cwd(), 'tests', 'e2e', '.auth');
  fs.mkdirSync(authDir, { recursive: true });

  const [hirerState, fixerState] = await Promise.all([
    createAuthState('hirer', '507f1f77bcf86cd799439011'),
    createAuthState('fixer', '507f1f77bcf86cd799439022'),
  ]);

  fs.writeFileSync(
    path.join(authDir, 'hirer.json'),
    JSON.stringify(hirerState, null, 2)
  );
  fs.writeFileSync(
    path.join(authDir, 'fixer.json'),
    JSON.stringify(fixerState, null, 2)
  );
}
