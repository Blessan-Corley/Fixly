import mongoose from 'mongoose';

// Side-effect imports — each module attaches to locationPreferenceSchema directly.
import './hooks';
import './indexes';
import './methods';
import './statics';

import { locationPreferenceSchema } from './schema';
import type { LocationPreference, LocationPreferenceModel } from './types';

export default (mongoose.models.LocationPreference as LocationPreferenceModel) ||
  mongoose.model<LocationPreference, LocationPreferenceModel>(
    'LocationPreference',
    locationPreferenceSchema
  );

export type {
  CurrentLocation,
  IpLocation,
  LocationHistoryEntry,
  LocationPreference,
  LocationPreferenceDocument,
  LocationPreferenceMethods,
  LocationPreferenceModel,
  LocationPreferences,
  LocationPrivacy,
  LocationSource,
  LocationUpdatePayload,
  RecentLocationEntry,
} from './types';
