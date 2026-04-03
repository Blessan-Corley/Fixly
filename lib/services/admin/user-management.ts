import connectDB from '@/lib/mongodb';
import { NotificationService } from '@/lib/services/notifications';
import User from '@/models/User';

import { isValidObjectId } from '../../mongo/objectid-utils';

export async function suspendUser(
  userId: string,
  _adminId: string,
  reason?: string
): Promise<Record<string, unknown>> {
  await connectDB();

  if (!isValidObjectId(userId)) throw new Error('Invalid user');

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        suspended: true,
        suspendedAt: new Date(),
        suspendedReason: reason ?? 'Suspended by administrator',
        banned: true,
        isActive: false,
      },
    },
    { new: true }
  ).lean<Record<string, unknown> | null>();

  if (!user) throw new Error('User not found');
  return user;
}

export async function verifyUser(
  userId: string,
  _adminId: string
): Promise<Record<string, unknown>> {
  await connectDB();

  if (!isValidObjectId(userId)) throw new Error('Invalid user');

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        isVerified: true,
        verifiedAt: new Date(),
        'verification.status': 'approved',
        'verification.reviewedAt': new Date(),
      },
    },
    { new: true }
  ).lean<Record<string, unknown> | null>();

  if (!user) throw new Error('User not found');
  return user;
}

export async function sendVerificationNotification(userId: string): Promise<void> {
  await NotificationService.createNotification(
    userId,
    'verification_update',
    'Your profile is now verified',
    'Your Fixly profile has been verified successfully.',
    '/dashboard/profile'
  );
}
