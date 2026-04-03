jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: {
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

jest.mock('@/lib/files/sanitiseFilename', () => ({
  sanitiseFilename: jest.fn((name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_')),
}));

jest.mock('@/lib/fileValidation', () => ({
  FileValidator: {
    validateFile: jest.fn(),
  },
}));

jest.mock('@/lib/redis', () => ({
  redisRateLimit: jest.fn(),
  redisUtils: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
  },
}));

jest.mock('@sentry/nextjs', () => ({
  captureEvent: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/security/csrf', () => ({
  csrfGuard: jest.fn(() => null),
  isCsrfExempt: jest.fn(() => false),
  validateCsrfMiddleware: jest.fn(() => null),
}));

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { POST as applyVerification } from '@/app/api/user/verification/apply/route';
import { POST as uploadProfilePhoto } from '@/app/api/user/profile-photo/route';
import cloudinary from '@/lib/cloudinary';
import { FileValidator } from '@/lib/fileValidation';
import { redisRateLimit } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import User from '@/models/User';

const TEST_CSRF = 'test-csrf-token-for-integration-tests';
const USER_ID = 'test-user-id';

function createTestSession(role: 'hirer' | 'fixer' | 'admin' = 'hirer') {
  return {
    user: { id: USER_ID, email: 'test@example.com', role, csrfToken: TEST_CSRF },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makeFormRequest(
  method: string,
  url: string,
  formData: FormData,
  csrfToken = TEST_CSRF
): Request {
  const headers: HeadersInit = {};
  if (csrfToken) (headers as Record<string, string>)['x-csrf-token'] = csrfToken;
  const req = new Request(url, { method, headers, body: formData });
  // JSDOM's Request does not expose formData() in this test environment;
  // patch it directly so route handlers can call request.formData().
  (req as Request & { formData: () => Promise<FormData> }).formData = async () => formData;
  return req;
}

function createMockFile(
  name = 'test.jpg',
  type = 'image/jpeg',
  size = 1024,
  validMagicBytes = false
): File {
  let contentBuffer: Buffer;
  let rawBytes: number[];
  if (validMagicBytes && type === 'image/jpeg') {
    // Real JPEG magic bytes: FF D8 FF E0, padded to requested size
    rawBytes = [0xff, 0xd8, 0xff, 0xe0, ...Array(Math.max(0, size - 4)).fill(0x00)];
  } else {
    rawBytes = Array(size).fill(0x78); // 'x'
  }
  const uint8 = new Uint8Array(rawBytes);
  const file = new File([uint8], name, { type });
  // JSDOM's File/Blob does not expose arrayBuffer(); polyfill it so route handlers
  // that call file.arrayBuffer() work correctly in the test environment.
  Object.defineProperty(file, 'arrayBuffer', {
    value: async (): Promise<ArrayBuffer> => uint8.buffer.slice(0) as ArrayBuffer,
    configurable: true,
  });
  return file;
}

describe('/api/user/verification/apply', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const formData = new FormData();
    formData.append('documentType', 'aadhaar');

    const response = await applyVerification(
      makeFormRequest('POST', 'http://localhost/api/user/verification/apply', formData)
    );
    expect(response.status).toBe(401);
  });

  it('returns 403 when CSRF token is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (csrfGuard as jest.Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 })
    );

    const formData = new FormData();
    formData.append('documentType', 'aadhaar');
    formData.append('documents', createMockFile());

    const response = await applyVerification(
      makeFormRequest('POST', 'http://localhost/api/user/verification/apply', formData, '')
    );
    expect(response.status).toBe(403);
  });

  it('returns 400 when documentType is invalid', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

    const formData = new FormData();
    formData.append('documentType', 'invalid_type');
    formData.append('documents', createMockFile());

    const response = await applyVerification(
      makeFormRequest('POST', 'http://localhost/api/user/verification/apply', formData)
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 when no documents are provided', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

    const formData = new FormData();
    formData.append('documentType', 'aadhaar');

    const response = await applyVerification(
      makeFormRequest('POST', 'http://localhost/api/user/verification/apply', formData)
    );
    expect(response.status).toBe(400);
  });

  it('returns 404 when user not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (User.findById as jest.Mock).mockResolvedValue(null);
    (FileValidator.validateFile as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

    const formData = new FormData();
    formData.append('documentType', 'aadhaar');
    formData.append('documents', createMockFile());

    // Mock cloudinary upload to succeed
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_opts: unknown, cb: (err: null, res: { secure_url: string; public_id: string }) => void) => {
        cb(null, { secure_url: 'https://res.cloudinary.com/test/image.jpg', public_id: 'test/image' });
        return { end: jest.fn() };
      }
    );

    const response = await applyVerification(
      makeFormRequest('POST', 'http://localhost/api/user/verification/apply', formData)
    );
    expect(response.status).toBe(404);
  });

  it('returns 400 when user is already verified', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (User.findById as jest.Mock).mockResolvedValue({
      _id: USER_ID,
      isVerified: true,
      verification: null,
    });
    (FileValidator.validateFile as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

    const formData = new FormData();
    formData.append('documentType', 'aadhaar');
    formData.append('documents', createMockFile());

    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_opts: unknown, cb: (err: null, res: { secure_url: string; public_id: string }) => void) => {
        cb(null, { secure_url: 'https://res.cloudinary.com/test/image.jpg', public_id: 'test/image' });
        return { end: jest.fn() };
      }
    );

    const response = await applyVerification(
      makeFormRequest('POST', 'http://localhost/api/user/verification/apply', formData)
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('already verified');
  });

  it('returns 400 when user has a pending verification application', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (User.findById as jest.Mock).mockResolvedValue({
      _id: USER_ID,
      isVerified: false,
      verification: { status: 'pending' },
    });
    (FileValidator.validateFile as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

    const formData = new FormData();
    formData.append('documentType', 'aadhaar');
    formData.append('documents', createMockFile());

    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_opts: unknown, cb: (err: null, res: { secure_url: string; public_id: string }) => void) => {
        cb(null, { secure_url: 'https://res.cloudinary.com/test/image.jpg', public_id: 'test/image' });
        return { end: jest.fn() };
      }
    );

    const response = await applyVerification(
      makeFormRequest('POST', 'http://localhost/api/user/verification/apply', formData)
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('pending verification');
  });

  it('returns 200 when verification application is submitted successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    const mockUser = {
      _id: USER_ID,
      isVerified: false,
      verification: null,
      addNotification: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (User.findById as jest.Mock).mockResolvedValue(mockUser);
    (FileValidator.validateFile as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_opts: unknown, cb: (err: null, res: { secure_url: string; public_id: string; width: number; height: number }) => void) => {
        cb(null, {
          secure_url: 'https://res.cloudinary.com/test/image.jpg',
          public_id: 'test/image',
          width: 400,
          height: 400,
        });
        return { end: jest.fn() };
      }
    );

    const formData = new FormData();
    formData.append('documentType', 'aadhaar');
    formData.append('documents', createMockFile());

    const response = await applyVerification(
      makeFormRequest('POST', 'http://localhost/api/user/verification/apply', formData)
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('submitted successfully');
    expect(body.applicationId).toBeDefined();
  });
});

describe('/api/user/profile-photo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redisRateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const formData = new FormData();
    formData.append('file', createMockFile());

    const response = await uploadProfilePhoto(
      makeFormRequest('POST', 'http://localhost/api/user/profile-photo', formData)
    );
    expect(response.status).toBe(401);
  });

  it('returns 403 when CSRF token is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (csrfGuard as jest.Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 })
    );

    const formData = new FormData();
    formData.append('file', createMockFile());

    const response = await uploadProfilePhoto(
      makeFormRequest('POST', 'http://localhost/api/user/profile-photo', formData, '')
    );
    expect(response.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (redisRateLimit as jest.Mock).mockResolvedValue({
      success: false,
      resetTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const formData = new FormData();
    formData.append('file', createMockFile());

    const response = await uploadProfilePhoto(
      makeFormRequest('POST', 'http://localhost/api/user/profile-photo', formData)
    );
    expect(response.status).toBe(429);
  });

  it('returns 400 when no file is provided', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

    const formData = new FormData();

    const response = await uploadProfilePhoto(
      makeFormRequest('POST', 'http://localhost/api/user/profile-photo', formData)
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 when file type is invalid', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

    const formData = new FormData();
    formData.append('file', createMockFile('test.gif', 'image/gif'));

    const response = await uploadProfilePhoto(
      makeFormRequest('POST', 'http://localhost/api/user/profile-photo', formData)
    );
    expect(response.status).toBe(400);
  });

  it('returns 404 when user not found in DB', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (User.findById as jest.Mock).mockResolvedValue(null);

    const formData = new FormData();
    formData.append('file', createMockFile());

    const response = await uploadProfilePhoto(
      makeFormRequest('POST', 'http://localhost/api/user/profile-photo', formData)
    );
    expect(response.status).toBe(404);
  });

  it('returns 200 and updates profile photo successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    const mockUser = {
      _id: USER_ID,
      profilePhoto: null,
      addNotification: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (User.findById as jest.Mock).mockResolvedValue(mockUser);
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_opts: unknown, cb: (err: null, res: { secure_url: string; public_id: string; width: number; height: number }) => void) => {
        cb(null, {
          secure_url: 'https://res.cloudinary.com/test/profile.jpg',
          public_id: 'fixly/profiles/test/profile_test',
          width: 400,
          height: 400,
        });
        return { end: jest.fn() };
      }
    );

    const formData = new FormData();
    formData.append('file', createMockFile('avatar.jpg', 'image/jpeg', 100 * 1024, true));

    const response = await uploadProfilePhoto(
      makeFormRequest('POST', 'http://localhost/api/user/profile-photo', formData)
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.profilePhoto.url).toContain('cloudinary');
    expect(mockUser.save).toHaveBeenCalled();
  });
});
