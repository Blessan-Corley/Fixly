// Barrel re-export — kept for backward compatibility with existing imports.
// New code should import directly from lib/location/*.

export { getCurrentUserLocation, updateCurrentLocation } from './location/currentLocation';
export {
  addToLocationHistory,
  getLocationHistory,
  getRecentLocations,
  updateRecentLocations,
} from './location/locationHistory';
export { getHomeAddress, setHomeAddress } from './location/homeAddress';
export {
  cleanupOldLocationData,
  findNearbyUsers,
  getLocationConfig,
  getLocationInsights,
} from './location/locationInsights';
export type {
  HomeAddress,
  LocationEntry,
  LocationInsights,
  LocationType,
} from './location/locationTracking.types';

import locationTrackingApi from './location/locationTrackingDefault';
export default locationTrackingApi;
