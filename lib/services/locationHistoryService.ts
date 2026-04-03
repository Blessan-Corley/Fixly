import {
  LocationHistoryService,
  type JobSuggestionsResult,
  type LocationEntry,
  type LocationHistoryResult,
  type LocationInput,
} from './locationHistory/service';

export type { JobSuggestionsResult, LocationEntry, LocationHistoryResult, LocationInput };

let locationHistoryServiceInstance: LocationHistoryService | null = null;

export async function getLocationHistoryService(): Promise<LocationHistoryService> {
  if (!locationHistoryServiceInstance) {
    locationHistoryServiceInstance = new LocationHistoryService();
    await locationHistoryServiceInstance.init();
  }

  return locationHistoryServiceInstance;
}

export async function startUserLocationTracking(
  userId: string,
  initialLocation: LocationInput | null = null
): Promise<void> {
  const service = await getLocationHistoryService();
  return service.startLocationTracking(userId, initialLocation);
}

export async function stopUserLocationTracking(userId: string): Promise<void> {
  const service = await getLocationHistoryService();
  return service.stopLocationTracking(userId);
}

export async function updateUserLocation(
  userId: string,
  location: LocationInput
): Promise<LocationEntry> {
  const service = await getLocationHistoryService();
  return service.updateUserLocation(userId, location);
}

export async function getUserLocationHistory(
  userId: string,
  limit = 20
): Promise<LocationHistoryResult> {
  const service = await getLocationHistoryService();
  return service.getLocationHistory(userId, limit);
}

export async function getUserJobSuggestions(userId: string): Promise<JobSuggestionsResult> {
  const service = await getLocationHistoryService();
  return service.getJobSuggestions(userId);
}

export function clearLocationHistorySingletonForTests(): void {
  locationHistoryServiceInstance = null;
}
