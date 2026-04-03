export type {
  Coordinates,
  UserLocation,
  StoredLocation,
  CityCoordinate,
  PermissionStateResult,
} from './location/types';

export {
  DISTANCE_RANGES,
  calculateDistance,
  filterJobsByRadius,
  formatDistance,
  getCityCoordinates,
  getDistancePriority,
  sortJobsByDistance,
} from './location/geo';

export { getUserLocation, checkLocationPermission } from './location/browser';

export {
  LOCATION_STORAGE_KEYS,
  clearUserLocation,
  isLocationRejected,
  loadUserLocation,
  saveLocationRejection,
  saveUserLocation,
} from './location/storage';
