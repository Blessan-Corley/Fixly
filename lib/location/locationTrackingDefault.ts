import { getCurrentUserLocation, updateCurrentLocation } from './currentLocation';
import { getHomeAddress, setHomeAddress } from './homeAddress';
import { getLocationHistory, getRecentLocations } from './locationHistory';
import {
  cleanupOldLocationData,
  findNearbyUsers,
  getLocationConfig,
  getLocationInsights,
} from './locationInsights';

const locationTrackingApi = {
  getCurrentUserLocation,
  updateCurrentLocation,
  setHomeAddress,
  getHomeAddress,
  getLocationHistory,
  getRecentLocations,
  findNearbyUsers,
  getLocationInsights,
  cleanupOldLocationData,
  getLocationConfig,
};

export default locationTrackingApi;
