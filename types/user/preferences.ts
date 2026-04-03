export interface UserPrivacy {
  profileVisibility: 'public' | 'verified' | 'private';
  showPhone: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showRating: boolean;
  allowReviews: boolean;
  allowMessages: boolean;
  dataSharingConsent: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  currency: 'INR' | 'USD';
  timezone: string;
  mapProvider: 'google' | 'openstreetmap';
  defaultView: 'list' | 'grid';
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  browserNotifications?: boolean;
  jobApplications: boolean;
  jobUpdates: boolean;
  paymentUpdates: boolean;
  marketing: boolean;
  newsletter: boolean;
  weeklyDigest: boolean;
  instantAlerts: boolean;
  jobAlerts: boolean;
  marketingEmails: boolean;
}
