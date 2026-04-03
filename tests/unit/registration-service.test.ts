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
    static findByEmail = vi.fn();
    static findOne = vi.fn();
    static constructUser = constructUser;
    static lastInstance: MockUser | null = null;

    constructor(data: Record<string, unknown>) {
      Object.assign(this, constructUser(data));
      MockUser.lastInstance = this;
    }
  }

  return {
    __esModule: true,
    default: MockUser,
  };
});

import User from '@/models/User';
import { RegistrationService } from '@/services/auth/registrationService';

const mockUserModel = User as unknown as {
  findByEmail: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  constructUser: ReturnType<typeof vi.fn>;
  lastInstance: {
    location?: {
      coordinates?: { latitude?: number; longitude?: number };
      city?: string;
      state?: string;
    };
  } | null;
};

function mockFindOneLean(result: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(result),
    }),
  };
}

describe('RegistrationService.registerUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserModel.findByEmail.mockResolvedValue(null);
    mockUserModel.findOne.mockImplementation((query: { phone?: unknown } | undefined) => {
      if (query?.phone) {
        return mockFindOneLean(null);
      }

      return null;
    });
  });

  it('rejects duplicate email accounts', async () => {
    mockUserModel.findByEmail.mockResolvedValue({ _id: 'existing-email' });

    const result = await RegistrationService.registerUser({
      authMethod: 'email',
      role: 'hirer',
      email: 'person@example.com',
      password: 'StrongPass1!',
      name: 'Person',
      username: 'person_user',
      phone: '9876543210',
      termsAccepted: true,
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Email already exists');
  });

  it('rejects duplicate phone accounts', async () => {
    mockUserModel.findOne.mockReturnValueOnce(mockFindOneLean({ _id: 'existing-phone' }));

    const result = await RegistrationService.registerUser({
      authMethod: 'email',
      role: 'hirer',
      email: 'person@example.com',
      password: 'StrongPass1!',
      name: 'Person',
      username: 'person_user',
      phone: '9876543210',
      termsAccepted: true,
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Phone number already exists');
  });

  it('rejects duplicate usernames', async () => {
    mockUserModel.findOne
      .mockReturnValueOnce(mockFindOneLean(null))
      .mockResolvedValueOnce({ _id: 'existing-username' });

    const result = await RegistrationService.registerUser({
      authMethod: 'email',
      role: 'hirer',
      email: 'person@example.com',
      password: 'StrongPass1!',
      name: 'Person',
      username: 'person_user',
      phone: '9876543210',
      termsAccepted: true,
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Username taken');
  });

  it('creates a fully registered email account with normalized location data', async () => {
    const result = await RegistrationService.registerUser({
      authMethod: 'email',
      role: 'fixer',
      email: 'person@example.com',
      password: 'StrongPass1!',
      name: 'Person',
      username: 'person_user',
      phone: '9876543210',
      skills: ['Plumbing'],
      location: {
        currentLocation: {
          lat: 12.9716,
          lng: 77.5946,
          source: 'gps',
        },
        homeAddress: {
          formattedAddress: 'MG Road, Bengaluru',
        },
        city: 'Bengaluru',
        state: 'Karnataka',
      },
      termsAccepted: true,
    });

    expect(result.success).toBe(true);
    expect(result.user?.role).toBe('fixer');
    expect(result.user?.authMethod).toBe('email');

    const constructorPayload = mockUserModel.constructUser.mock.calls[0]?.[0] as {
      phone?: string;
      emailVerified?: boolean;
      phoneVerified?: boolean;
      isVerified?: boolean;
    };
    const createdUser = mockUserModel.lastInstance;

    expect(constructorPayload.phone).toBe('+919876543210');
    expect(constructorPayload.emailVerified).toBe(true);
    expect(constructorPayload.phoneVerified).toBe(false);
    expect(constructorPayload.isVerified).toBe(false);
    expect(createdUser?.location).toEqual({
      coordinates: {
        latitude: 12.9716,
        longitude: 77.5946,
      },
      address: 'MG Road, Bengaluru',
      city: 'Bengaluru',
      state: 'Karnataka',
      source: 'gps',
      homeAddress: {
        doorNo: undefined,
        street: undefined,
        district: undefined,
        state: undefined,
        postalCode: undefined,
        formattedAddress: 'MG Road, Bengaluru',
        coordinates: undefined,
      },
    });
  });
});
