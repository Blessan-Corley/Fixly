// Re-export barrel — consumers import from here unchanged
export type {
  Coordinates,
  IndiaBounds,
  LocationLike,
  LocationValidationResult,
  MajorIndianCity,
  NearestCity,
  TouchEventLike,
  TouchPointLike,
} from './locationUtils.types';

export { INDIA_BOUNDS, MAJOR_INDIAN_CITIES, isWithinIndiaBounds } from './locationConstants';

export {
  calculateDistance,
  findNearestCity,
  formatLocationName,
  getCurrentLocation,
  validateLocation,
} from './locationGeo';

export { locationCache } from './locationBrowserCache';

export {
  announceToScreenReader,
  debounce,
  getTouchCoordinates,
  handleLocationError,
  isMobileDevice,
} from './locationHelpers';

// Default export object for legacy callers
import { locationCache } from './locationBrowserCache';
import { INDIA_BOUNDS, MAJOR_INDIAN_CITIES, isWithinIndiaBounds } from './locationConstants';
import {
  calculateDistance,
  findNearestCity,
  formatLocationName,
  getCurrentLocation,
  validateLocation,
} from './locationGeo';
import {
  announceToScreenReader,
  debounce,
  getTouchCoordinates,
  handleLocationError,
  isMobileDevice,
} from './locationHelpers';

const locationUtils = {
  INDIA_BOUNDS,
  MAJOR_INDIAN_CITIES,
  isWithinIndiaBounds,
  getCurrentLocation,
  calculateDistance,
  findNearestCity,
  formatLocationName,
  validateLocation,
  locationCache,
  handleLocationError,
  debounce,
  isMobileDevice,
  getTouchCoordinates,
  announceToScreenReader,
};

export default locationUtils;
