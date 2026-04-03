export const TRACKING_STALE_AFTER_MS = 30 * 60 * 1000;
export const TRACKING_STATE_TTL_SECONDS = 24 * 60 * 60;
export const LOCATION_HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const LOCATION_CACHE_TTL_SECONDS = 2 * 60 * 60;
export const JOB_SUGGESTIONS_TTL_SECONDS = 60 * 60;
export const JOB_SUGGESTION_RADIUS_KM = 25;
export const SUGGESTION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
export const NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;

export const locationTrackingKey = (userId: string): string => `location_tracking:${userId}`;
export const userLocationCacheKey = (userId: string): string => `user_location:${userId}`;
export const jobSuggestionsCacheKey = (userId: string): string => `job_suggestions:${userId}`;
