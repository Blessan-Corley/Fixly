import {
  calculateDistance,
  filterJobsByRadius,
  formatDistance,
  getCityCoordinates,
  getDistancePriority,
  sortJobsByDistance,
} from '@/utils/locationUtils';

describe('calculateDistance', () => {
  it('returns null for missing coordinates', () => {
    expect(calculateDistance(null, null, 28.6, 77.2)).toBeNull();
    expect(calculateDistance(28.6, 77.2, null, null)).toBeNull();
    expect(calculateDistance(undefined, 77.2, 28.6, 77.2)).toBeNull();
    expect(calculateDistance(NaN, 77.2, 28.6, 77.2)).toBeNull();
  });

  it('returns 0 for same coordinates', () => {
    const dist = calculateDistance(28.6, 77.2, 28.6, 77.2);
    expect(dist).not.toBeNull();
    expect(dist!).toBeCloseTo(0, 5);
  });

  it('calculates approximate distance between two known cities', () => {
    // Delhi to Mumbai: approx 1150-1200 km
    const dist = calculateDistance(28.6139, 77.2090, 19.0760, 72.8777);
    expect(dist).not.toBeNull();
    expect(dist!).toBeGreaterThan(1100);
    expect(dist!).toBeLessThan(1300);
  });

  it('calculates short distance correctly', () => {
    // Points ~1km apart
    const dist = calculateDistance(28.6139, 77.2090, 28.6229, 77.2090);
    expect(dist).not.toBeNull();
    expect(dist!).toBeGreaterThan(0.5);
    expect(dist!).toBeLessThan(2);
  });

  it('is symmetric (A to B = B to A)', () => {
    const d1 = calculateDistance(28.6139, 77.2090, 19.0760, 72.8777);
    const d2 = calculateDistance(19.0760, 72.8777, 28.6139, 77.2090);
    expect(d1).toBeCloseTo(d2!, 2);
  });
});

describe('formatDistance', () => {
  it('returns empty string for null/undefined/zero', () => {
    expect(formatDistance(null)).toBe('');
    expect(formatDistance(undefined)).toBe('');
    expect(formatDistance(0)).toBe('');
    expect(formatDistance(-5)).toBe('');
  });

  it('formats sub-kilometer as meters', () => {
    expect(formatDistance(0.5)).toBe('500m');
    expect(formatDistance(0.1)).toBe('100m');
  });

  it('formats under 10km with one decimal', () => {
    expect(formatDistance(3.5)).toBe('3.5km');
    expect(formatDistance(9.9)).toBe('9.9km');
  });

  it('formats 10km and above as rounded integer', () => {
    expect(formatDistance(10)).toBe('10km');
    expect(formatDistance(15.7)).toBe('16km');
    expect(formatDistance(100.2)).toBe('100km');
  });
});

describe('sortJobsByDistance', () => {
  const jobs = [
    { id: 'far', location: { lat: 19.076, lng: 72.878 } }, // Mumbai from Delhi
    { id: 'near', location: { lat: 28.65, lng: 77.21 } },  // ~5km from Delhi
    { id: 'medium', location: { lat: 25.59, lng: 85.14 } }, // Patna
  ];
  const userLat = 28.6139;
  const userLng = 77.209;

  it('returns empty array for empty input', () => {
    expect(sortJobsByDistance([], userLat, userLng)).toEqual([]);
  });

  it('returns jobs with null distance when no user coords', () => {
    const result = sortJobsByDistance(jobs, null, null);
    expect(result).toHaveLength(3);
    result.forEach((j) => expect(j.distance).toBeNull());
  });

  it('sorts nearest job first', () => {
    const result = sortJobsByDistance(jobs, userLat, userLng);
    expect(result[0].id).toBe('near');
  });

  it('puts jobs with null location at the end', () => {
    const mixedJobs = [
      { id: 'no-location', location: null },
      { id: 'has-location', location: { lat: 28.65, lng: 77.21 } },
    ];
    const result = sortJobsByDistance(mixedJobs, userLat, userLng);
    expect(result[result.length - 1].id).toBe('no-location');
  });

  it('adds distance property to each job', () => {
    const result = sortJobsByDistance(jobs, userLat, userLng);
    result.forEach((job) => {
      if (job.location?.lat && job.location?.lng) {
        expect(typeof job.distance === 'number').toBe(true);
      }
    });
  });
});

describe('filterJobsByRadius', () => {
  const jobs = [
    { id: 'very-near', location: { lat: 28.62, lng: 77.21 } },  // ~1km
    { id: 'near', location: { lat: 28.65, lng: 77.21 } },       // ~5km
    { id: 'far', location: { lat: 19.076, lng: 72.878 } },       // ~1200km
  ];
  const userLat = 28.6139;
  const userLng = 77.209;

  it('returns all jobs when no user coords', () => {
    expect(filterJobsByRadius(jobs, null, null, 10)).toHaveLength(3);
  });

  it('returns all jobs when no radius specified', () => {
    expect(filterJobsByRadius(jobs, userLat, userLng, null)).toHaveLength(3);
  });

  it('returns empty array for empty input', () => {
    expect(filterJobsByRadius([], userLat, userLng, 10)).toHaveLength(0);
  });

  it('filters out far jobs when radius is small', () => {
    const result = filterJobsByRadius(jobs, userLat, userLng, 10);
    expect(result.some((j) => j.id === 'far')).toBe(false);
    expect(result.some((j) => j.id === 'very-near')).toBe(true);
  });

  it('includes all nearby jobs within large radius', () => {
    const result = filterJobsByRadius(jobs, userLat, userLng, 2000);
    expect(result).toHaveLength(3);
  });
});

describe('getCityCoordinates', () => {
  const cities = [
    { name: 'Delhi', lat: 28.6139, lng: 77.209 },
    { name: 'Mumbai', lat: 19.076, lng: 72.878 },
  ];

  it('returns null for unknown city', () => {
    expect(getCityCoordinates('Atlantis', cities)).toBeNull();
  });

  it('returns null for empty city name', () => {
    expect(getCityCoordinates('', cities)).toBeNull();
  });

  it('returns null for empty cities array', () => {
    expect(getCityCoordinates('Delhi', [])).toBeNull();
  });

  it('returns coordinates for matching city (case-insensitive)', () => {
    const result = getCityCoordinates('delhi', cities);
    expect(result).toEqual({ lat: 28.6139, lng: 77.209 });
  });

  it('finds city with exact case', () => {
    const result = getCityCoordinates('Mumbai', cities);
    expect(result).toEqual({ lat: 19.076, lng: 72.878 });
  });
});

describe('getDistancePriority', () => {
  it('returns 0 for null/undefined/invalid', () => {
    expect(getDistancePriority(null)).toBe(0);
    expect(getDistancePriority(undefined)).toBe(0);
    expect(getDistancePriority(0)).toBe(0);
    expect(getDistancePriority(-5)).toBe(0);
  });

  it('returns 4 for <=2km', () => {
    expect(getDistancePriority(1)).toBe(4);
    expect(getDistancePriority(2)).toBe(4);
  });

  it('returns 3 for >2km and <=5km', () => {
    expect(getDistancePriority(3)).toBe(3);
    expect(getDistancePriority(5)).toBe(3);
  });

  it('returns 2 for >5km and <=10km', () => {
    expect(getDistancePriority(7)).toBe(2);
    expect(getDistancePriority(10)).toBe(2);
  });

  it('returns 1 for >10km and <=25km', () => {
    expect(getDistancePriority(15)).toBe(1);
    expect(getDistancePriority(25)).toBe(1);
  });

  it('returns 0 for >25km', () => {
    expect(getDistancePriority(30)).toBe(0);
    expect(getDistancePriority(100)).toBe(0);
  });
});
