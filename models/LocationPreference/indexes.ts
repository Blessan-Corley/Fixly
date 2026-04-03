import { locationPreferenceSchema } from './schema';
import type { LocationPreferenceDocument } from './types';

locationPreferenceSchema.index({ lastUpdated: -1 });
locationPreferenceSchema.index(
  { 'currentLocation.lat': 1, 'currentLocation.lng': 1 },
  { name: 'location_2d' }
);

locationPreferenceSchema.virtual('locationAge').get(function (this: LocationPreferenceDocument) {
  if (!this.lastLocationUpdate) return null;
  return Date.now() - this.lastLocationUpdate.getTime();
});
