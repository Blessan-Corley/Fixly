import { locationPreferenceSchema } from './schema';
import type { LocationHistoryEntry, LocationPreferenceDocument } from './types';

locationPreferenceSchema.pre('save', function (this: LocationPreferenceDocument, next) {
  if (!this.privacy.trackLocationHistory) {
    this.locationHistory = [];
  } else {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.locationHistory = this.locationHistory.filter(
      (entry: LocationHistoryEntry) => entry.timestamp > thirtyDaysAgo
    );
  }
  next();
});
