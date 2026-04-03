import type { UserLocation } from '../../utils/locationUtils';

export type LocationState = 'unknown' | 'requesting' | 'granted' | 'denied' | 'error';

export interface LocationPermissionProps {
  onLocationUpdate?: (location: UserLocation | null) => void;
  showBanner?: boolean;
  className?: string;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Unable to get location';
}

export function isDeniedMessage(message: string): boolean {
  const lowered = message.toLowerCase();
  return lowered.includes('denied') || lowered.includes('blocked');
}

export async function saveLocationToApi(location: UserLocation): Promise<void> {
  try {
    const response = await fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
        consent: true,
        source: 'gps',
      }),
    });

    if (!response.ok) {
      console.warn('Failed to save location to database, using local storage only');
    }
  } catch (error: unknown) {
    console.warn('API error while saving location:', error);
  }
}

export async function clearLocationFromApi(): Promise<void> {
  try {
    await fetch('/api/location', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.warn('API error while clearing location:', error);
  }
}
