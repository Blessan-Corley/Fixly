import type { LocationHistoryEntry as _LHE } from './types';
import type { LocationPreferenceDocument, LocationUpdatePayload, RecentLocationEntry } from './types';
import { locationPreferenceSchema } from './schema';

locationPreferenceSchema.methods.isLocationRecent = function (
  this: LocationPreferenceDocument
): boolean {
  if (!this.lastLocationUpdate) return false;
  const oneHour = 60 * 60 * 1000;
  return Date.now() - this.lastLocationUpdate.getTime() < oneHour;
};

locationPreferenceSchema.methods.updateLocation = function (
  this: LocationPreferenceDocument,
  locationData: LocationUpdatePayload
): Promise<LocationPreferenceDocument> {
  if (typeof locationData.lat !== 'number' || locationData.lat < -90 || locationData.lat > 90) {
    throw new Error('Invalid latitude');
  }
  if (typeof locationData.lng !== 'number' || locationData.lng < -180 || locationData.lng > 180) {
    throw new Error('Invalid longitude');
  }

  const currentLat = parseFloat(String(locationData.lat));
  const currentLng = parseFloat(String(locationData.lng));

  let distanceFromPrevious: number | null = null;
  let isSignificantMove = false;

  if (
    typeof this.currentLocation?.lat === 'number' &&
    typeof this.currentLocation?.lng === 'number'
  ) {
    const R = 6371;
    const dLat = ((currentLat - this.currentLocation.lat) * Math.PI) / 180;
    const dLng = ((currentLng - this.currentLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((this.currentLocation.lat * Math.PI) / 180) *
        Math.cos((currentLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    distanceFromPrevious = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R;
    isSignificantMove = distanceFromPrevious > 1;
  }

  this.currentLocation = {
    ...this.currentLocation,
    ...locationData,
    lat: currentLat,
    lng: currentLng,
  };

  this.lastLocationUpdate = new Date();
  this.lastUpdated = new Date();

  const recentLocation = {
    lat: currentLat,
    lng: currentLng,
    city: locationData.city ?? this.currentLocation.city,
    state: locationData.state ?? this.currentLocation.state,
    timestamp: new Date(),
    usageCount: 1,
  };

  const existingIndex = this.recentLocations.findIndex(
    (location: RecentLocationEntry) =>
      typeof location.lat === 'number' &&
      typeof location.lng === 'number' &&
      Math.abs(location.lat - currentLat) < 0.001 &&
      Math.abs(location.lng - currentLng) < 0.001
  );

  if (existingIndex >= 0) {
    this.recentLocations[existingIndex].usageCount++;
    this.recentLocations[existingIndex].timestamp = new Date();
  } else {
    this.recentLocations.unshift(recentLocation);
    this.recentLocations = this.recentLocations.slice(0, 5);
  }

  if (this.privacy.trackLocationHistory) {
    const historyEntry = {
      lat: currentLat,
      lng: currentLng,
      accuracy: locationData.accuracy,
      source: locationData.source ?? 'gps',
      address: locationData.address,
      city: locationData.city,
      state: locationData.state,
      pincode: locationData.pincode,
      isSignificantMove,
      distanceFromPrevious,
      timestamp: new Date(),
    };

    this.locationHistory.push(historyEntry);

    if (this.locationHistory.length > 100) {
      this.locationHistory = this.locationHistory.slice(-100);
    }
  }

  return this.save();
};
