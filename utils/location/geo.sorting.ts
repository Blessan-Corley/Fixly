import { calculateDistance } from './geo';

export function sortJobsByDistance<
  T extends { location?: { lat?: number | null; lng?: number | null } | null },
>(
  jobs: T[],
  userLat?: number | null,
  userLng?: number | null
): Array<T & { distance: number | null }> {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];

  const isFinite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (!isFinite(userLat) || !isFinite(userLng)) {
    return jobs.map((job) => ({ ...job, distance: null }));
  }

  return jobs
    .map((job) => ({
      ...job,
      distance: calculateDistance(
        userLat,
        userLng,
        job.location?.lat ?? null,
        job.location?.lng ?? null
      ),
    }))
    .sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
}

export function filterJobsByRadius<
  T extends { location?: { lat?: number | null; lng?: number | null } | null },
>(jobs: T[], userLat?: number | null, userLng?: number | null, radiusKm?: number | null): T[] {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];

  const isFinite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (!isFinite(userLat) || !isFinite(userLng) || !isFinite(radiusKm)) return jobs;

  return jobs.filter((job) => {
    const distance = calculateDistance(
      userLat,
      userLng,
      job.location?.lat ?? null,
      job.location?.lng ?? null
    );
    return distance !== null && distance <= radiusKm;
  });
}
