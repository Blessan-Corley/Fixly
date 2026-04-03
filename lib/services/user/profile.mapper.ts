import type { UserDocument } from '@/lib/services/user/profile.schema';
import { normalizePhotoUrl } from '@/lib/services/user/profile.schema';

export function mapProfileResponse(user: UserDocument): Record<string, unknown> {
  const notifications = Array.isArray(user.notifications) ? user.notifications : [];
  const unreadNotifications = notifications.filter((item) => !item?.read).length;

  const photoUrl = normalizePhotoUrl(user.profilePhoto, user.picture);
  const locationHistory = Array.isArray(user.locationHistory) ? user.locationHistory.slice(0, 5) : [];

  return {
    success: true,
    user: {
      _id: user._id,
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      bio: user.bio ?? '',
      profilePhoto: photoUrl,
      photoURL: photoUrl,
      isRegistered: Boolean(user.isRegistered),
      banned: Boolean(user.banned),
      location: user.location ?? null,
      locationHistory,
      skills: user.role === 'fixer' ? user.skills || [] : undefined,
      rating: user.rating || { average: 0, count: 0 },
      jobsCompleted: user.jobsCompleted || 0,
      totalEarnings: user.totalEarnings || 0,
      plan: user.plan || { type: 'free', status: 'active' },
      unreadNotifications,
      preferences: user.preferences || {
        emailNotifications: true,
        smsNotifications: true,
        jobAlerts: true,
      },
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      authMethod: user.authMethod || 'email',
      emailVerified: user.emailVerified !== false,
      phoneVerified: Boolean(user.phoneVerified),
      availableNow: user.availableNow ?? true,
      serviceRadius: user.serviceRadius ?? 10,
      hasGoogleAuth: Boolean(user.googleId),
      hasPhoneAuth: Boolean(user.firebaseUid),
    },
  };
}

export function mapUpdatedProfileResponse(user: UserDocument): Record<string, unknown> {
  return {
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      name: user.name,
      bio: user.bio ?? '',
      location: user.location ?? null,
      locationHistory: Array.isArray(user.locationHistory) ? user.locationHistory.slice(0, 5) : [],
      skills: user.skills || [],
      preferences: user.preferences,
      profilePhoto: user.profilePhoto,
      availableNow: user.availableNow,
      serviceRadius: user.serviceRadius,
    },
  };
}
