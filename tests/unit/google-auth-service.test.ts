import { vi } from 'vitest';
vi.mock('@/models/User', () => {
  const constructUser = vi.fn((data: Record<string, unknown>) => ({
    ...data,
    _id: {
      toString: () => 'new-user-1',
    },
    save: vi.fn().mockResolvedValue(undefined),
  }));

  class MockUser {
    static findByEmailOrGoogleId = vi.fn();
    static findOne = vi.fn();
    static constructUser = constructUser;

    constructor(data: Record<string, unknown>) {
      Object.assign(this, constructUser(data));
    }
  }

  return {
    __esModule: true,
    default: MockUser,
  };
});

import User from '@/models/User';
import { GoogleAuthService } from '@/services/auth/googleService';

const mockUserModel = User as unknown as {
  findByEmailOrGoogleId: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  constructUser: ReturnType<typeof vi.fn>;
};

type LeanResult = { _id: string } | null;

function mockFindOneLean(result: LeanResult) {
  return {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(result),
    }),
  };
}

describe('GoogleAuthService.completeProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserModel.findByEmailOrGoogleId.mockResolvedValue(null);
    mockUserModel.findOne.mockReset();
  });

  it('rejects invalid or missing google session context', async () => {
    const result = await GoogleAuthService.completeProfile(
      {
        email: 'ignored@example.com',
        role: 'fixer',
        username: 'test_user',
        phone: '9876543210',
        name: 'Test User',
        authMethod: 'google',
      },
      null
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid session');
  });

  it('rejects sessions that do not include a usable google account id', async () => {
    const result = await GoogleAuthService.completeProfile(
      {
        email: 'ignored@example.com',
        role: 'fixer',
        username: 'test_user',
        phone: '9876543210',
        name: 'Test User',
        authMethod: 'google',
      },
      {
        id: 'regular-user-id',
        email: 'person@example.com',
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid session');
  });

  it('rejects invalid phone numbers before lookup', async () => {
    const result = await GoogleAuthService.completeProfile(
      {
        email: 'person@example.com',
        role: 'fixer',
        username: 'test_user',
        phone: '12345',
        name: 'Person',
        authMethod: 'google',
      },
      {
        id: 'pending_google:google-123',
        email: 'person@example.com',
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('A valid phone number is required');
    expect(mockUserModel.findByEmailOrGoogleId).not.toHaveBeenCalled();
  });

  it('rejects empty usernames before lookup', async () => {
    const result = await GoogleAuthService.completeProfile(
      {
        email: 'person@example.com',
        role: 'fixer',
        username: '   ',
        phone: '9876543210',
        name: 'Person',
        authMethod: 'google',
      },
      {
        id: 'pending_google:google-123',
        email: 'person@example.com',
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('A valid username is required');
    expect(mockUserModel.findByEmailOrGoogleId).not.toHaveBeenCalled();
  });

  it('rejects already registered google-backed users', async () => {
    mockUserModel.findByEmailOrGoogleId.mockResolvedValue({
      _id: { toString: () => 'existing-1' },
      role: 'fixer',
      isRegistered: true,
      phoneVerified: false,
      emailVerified: true,
      isVerified: false,
      providers: ['google'],
      save: vi.fn().mockResolvedValue(undefined),
    });

    const result = await GoogleAuthService.completeProfile(
      {
        email: 'person@example.com',
        role: 'fixer',
        username: 'new_username',
        phone: '9876543210',
        name: 'Person',
        authMethod: 'google',
      },
      {
        id: 'pending_google:google-123',
        email: 'person@example.com',
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('Please sign in instead');
  });

  it('blocks role changes when pending account role is already locked', async () => {
    mockUserModel.findByEmailOrGoogleId.mockResolvedValue({
      _id: { toString: () => 'existing-1' },
      role: 'hirer',
      isRegistered: false,
      phoneVerified: false,
      emailVerified: true,
      isVerified: false,
      providers: ['google'],
      save: vi.fn().mockResolvedValue(undefined),
    });
    mockUserModel.findOne.mockReturnValue(mockFindOneLean(null));

    const result = await GoogleAuthService.completeProfile(
      {
        email: 'person@example.com',
        role: 'fixer',
        username: 'new_username',
        phone: '9876543210',
        name: 'Person',
        authMethod: 'google',
      },
      {
        id: 'pending_google:google-123',
        email: 'person@example.com',
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('role is already locked');
  });

  it('rejects duplicate phone numbers owned by another account', async () => {
    mockUserModel.findByEmailOrGoogleId.mockResolvedValue(null);
    mockUserModel.findOne
      .mockReturnValueOnce(mockFindOneLean({ _id: 'owner-1' }))
      .mockReturnValueOnce(mockFindOneLean(null));

    const result = await GoogleAuthService.completeProfile(
      {
        email: 'person@example.com',
        role: 'fixer',
        username: 'new_username',
        phone: '9876543210',
        name: 'Person',
        authMethod: 'google',
      },
      {
        id: 'pending_google:google-123',
        email: 'person@example.com',
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('Phone number already exists');
  });

  it('rejects duplicate usernames owned by another account', async () => {
    mockUserModel.findByEmailOrGoogleId.mockResolvedValue(null);
    mockUserModel.findOne
      .mockReturnValueOnce(mockFindOneLean(null))
      .mockReturnValueOnce(mockFindOneLean({ _id: 'owner-2' }));

    const result = await GoogleAuthService.completeProfile(
      {
        email: 'person@example.com',
        role: 'fixer',
        username: 'new_username',
        phone: '9876543210',
        name: 'Person',
        authMethod: 'google',
      },
      {
        id: 'pending_google:google-123',
        email: 'person@example.com',
      }
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('Username taken');
  });

  it('creates a registered google account with normalized profile details', async () => {
    mockUserModel.findByEmailOrGoogleId.mockResolvedValue(null);
    mockUserModel.findOne
      .mockReturnValueOnce(mockFindOneLean(null))
      .mockReturnValueOnce(mockFindOneLean(null));

    const result = await GoogleAuthService.completeProfile(
      {
        email: 'person@example.com',
        role: 'fixer',
        username: 'new_username',
        phone: '9876543210',
        name: 'Person',
        authMethod: 'google',
        skills: ['Plumbing', 'Repairs'],
      },
      {
        id: 'pending_google:google-123',
        email: 'person@example.com',
        name: 'Person Name',
        image: 'https://example.com/avatar.png',
      }
    );

    expect(result.success).toBe(true);
    expect(result.user?.authMethod).toBe('google');
    expect(result.user?.isRegistered).toBe(true);
    expect(result.user?.role).toBe('fixer');

    const constructorPayload = mockUserModel.constructUser.mock.calls[0]?.[0] as {
      phone?: string;
      providers?: string[];
      phoneVerified?: boolean;
      emailVerified?: boolean;
    };
    expect(constructorPayload.phone).toBe('+919876543210');
    expect(constructorPayload.providers).toEqual(expect.arrayContaining(['google']));
    expect(constructorPayload.phoneVerified).toBe(false);
    expect(constructorPayload.emailVerified).toBe(true);
  });

  it('uses the email prefix as a fallback display name when the google profile name is missing', async () => {
    mockUserModel.findByEmailOrGoogleId.mockResolvedValue(null);
    mockUserModel.findOne
      .mockReturnValueOnce(mockFindOneLean(null))
      .mockReturnValueOnce(mockFindOneLean(null));

    const result = await GoogleAuthService.completeProfile(
      {
        email: 'person@example.com',
        role: 'hirer',
        username: 'hirer_user',
        phone: '9876543210',
        name: 'Ignored Name',
        authMethod: 'google',
      },
      {
        googleId: 'google-123',
        email: 'person@example.com',
        name: '   ',
      }
    );

    expect(result.success).toBe(true);
    const constructorPayload = mockUserModel.constructUser.mock.calls[0]?.[0] as {
      name?: string;
      skills?: string[];
      picture?: string;
      profilePhoto?: unknown;
    };
    expect(constructorPayload.name).toBe('person');
    expect(constructorPayload.skills).toBeUndefined();
    expect(constructorPayload.picture).toBeUndefined();
    expect(constructorPayload.profilePhoto).toBeUndefined();
  });

  it('updates an existing pending google profile and keeps the role locked in place', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const existingUser: {
      _id: { toString: () => string };
      name: string;
      email: string;
      username: string;
      role: string;
      phone: string;
      emailVerified: boolean;
      phoneVerified: boolean;
      isVerified: boolean;
      isRegistered: boolean;
      providers: string[];
      googleId?: string;
      picture?: string;
      profilePhoto?: {
        url: string;
        source: string;
        lastUpdated: Date;
      };
      phoneVerifiedAt?: Date;
      authMethod?: string;
      skills?: string[];
      location?: {
        address?: string;
      };
      save: ReturnType<typeof vi.fn>;
    } = {
      _id: { toString: () => 'existing-1' },
      name: 'Existing User',
      email: 'person@example.com',
      username: 'old_name',
      role: 'fixer',
      phone: '+919999999999',
      emailVerified: false,
      phoneVerified: true,
      isVerified: true,
      isRegistered: false,
      providers: ['email'],
      googleId: undefined,
      picture: undefined,
      profilePhoto: undefined,
      phoneVerifiedAt: new Date(),
      save,
    };

    mockUserModel.findByEmailOrGoogleId.mockResolvedValue(existingUser);
    mockUserModel.findOne
      .mockReturnValueOnce(mockFindOneLean(null))
      .mockReturnValueOnce(mockFindOneLean(null));

    const result = await GoogleAuthService.completeProfile(
      {
        email: 'person@example.com',
        role: 'fixer',
        username: 'updated_name',
        phone: '9876543210',
        name: 'Person',
        authMethod: 'google',
        location: {
          homeAddress: {
            formattedAddress: 'Updated Street',
          },
          currentLocation: {
            lat: 12.9716,
            lng: 77.5946,
            source: 'gps',
          },
        },
        skills: ['Plumbing', 'Repairs'],
      },
      {
        id: 'pending_google:google-123',
        email: 'person@example.com',
        image: 'https://example.com/avatar.png',
      }
    );

    expect(result.success).toBe(true);
    expect(existingUser.role).toBe('fixer');
    expect(existingUser.phone).toBe('+919876543210');
    expect(existingUser.username).toBe('updated_name');
    expect(existingUser.googleId).toBe('google-123');
    expect(existingUser.picture).toBe('https://example.com/avatar.png');
    expect(existingUser.profilePhoto).toEqual(
      expect.objectContaining({
        url: 'https://example.com/avatar.png',
        source: 'google',
      })
    );
    expect(existingUser.phoneVerified).toBe(false);
    expect(existingUser.phoneVerifiedAt).toBeUndefined();
    expect(existingUser.isRegistered).toBe(true);
    expect(existingUser.authMethod).toBe('google');
    expect(existingUser.providers).toEqual(['email', 'google']);
    expect(existingUser.skills).toEqual(['Plumbing', 'Repairs']);
    expect(existingUser.location).toEqual(
      expect.objectContaining({
        address: 'Updated Street',
      })
    );
    expect(save).toHaveBeenCalled();
  });
});
