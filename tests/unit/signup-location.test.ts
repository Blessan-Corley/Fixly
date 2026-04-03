import { normalizeSignupLocation } from '@/services/auth/signupLocation';

describe('normalizeSignupLocation', () => {
  it('returns current GPS coordinates when provided', () => {
    const result = normalizeSignupLocation({
      currentLocation: {
        lat: 12.9716,
        lng: 77.5946,
        source: 'gps',
      },
      city: 'Bengaluru',
      state: 'Karnataka',
    });

    expect(result).toEqual({
      coordinates: {
        latitude: 12.9716,
        longitude: 77.5946,
      },
      address: undefined,
      city: 'Bengaluru',
      state: 'Karnataka',
      source: 'gps',
      homeAddress: undefined,
    });
  });

  it('falls back to home address coordinates when GPS is absent', () => {
    const result = normalizeSignupLocation({
      city: 'Chennai',
      state: 'Tamil Nadu',
      homeAddress: {
        doorNo: '12A',
        street: 'North Street',
        district: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        formattedAddress: '12A North Street, Chennai',
        coordinates: {
          lat: 13.0827,
          lng: 80.2707,
        },
      },
    });

    expect(result?.coordinates).toEqual({
      latitude: 13.0827,
      longitude: 80.2707,
    });
    expect(result?.homeAddress?.coordinates).toEqual({
      latitude: 13.0827,
      longitude: 80.2707,
    });
    expect(result?.address).toBe('12A North Street, Chennai');
  });

  it('preserves already-normalized user location objects', () => {
    const location = {
      coordinates: {
        latitude: 9.9252,
        longitude: 78.1198,
      },
      city: 'Madurai',
      state: 'Tamil Nadu',
    };

    expect(normalizeSignupLocation(location)).toBe(location);
  });

  it('returns undefined when location payload is empty', () => {
    expect(normalizeSignupLocation({})).toBeUndefined();
  });
});
