import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { logger } from '../../lib/logger';
import type { IUser } from '../../types/User';
import { hasActivePaidPlan } from './helpers';
import type { IUserModel } from './types';

export function addUserMethods(schema: mongoose.Schema<IUser, IUserModel>): void {
  schema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    if (!this.passwordHash) return false;
    return bcrypt.compare(candidatePassword, this.passwordHash);
  };

  schema.methods.canPostJob = function (): boolean {
    if (this.role !== 'hirer' || this.banned) return false;
    if (hasActivePaidPlan(this)) return true;
    if (!this.lastJobPostedAt) return true;
    return new Date(this.lastJobPostedAt) < new Date(Date.now() - 4 * 60 * 60 * 1000);
  };

  schema.methods.getNextJobPostTime = function (): Date | null {
    if (this.role !== 'hirer' || this.banned) return null;
    if (hasActivePaidPlan(this)) return null;
    if (!this.lastJobPostedAt) return null;
    const nextAllowed = new Date(new Date(this.lastJobPostedAt).getTime() + 4 * 60 * 60 * 1000);
    return new Date() >= nextAllowed ? null : nextAllowed;
  };

  schema.methods.canApplyToJob = function (): boolean {
    if (this.role !== 'fixer' || this.banned) return false;
    if (hasActivePaidPlan(this)) return true;
    return (this.plan?.creditsUsed ?? 0) < 3;
  };

  schema.methods.canBeAssignedJob = function (): boolean {
    return this.canApplyToJob();
  };

  schema.methods.addNotification = async function (
    type: string,
    title: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<IUser> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const createdAt = new Date();
    const notification = {
      id: notificationId,
      type,
      title,
      message,
      data: data ?? {},
      read: false,
      createdAt,
    };

    // Atomic $push with $slice avoids full-document rewrite and eliminates the
    // read-modify-save race condition when multiple notifications arrive concurrently.
    // $slice: -200 keeps the 200 most recent entries (newest at end after $push).
    // We prepend by using $position: 0 so the latest entry is always first in the array.
    const updateResult = await (this.constructor as mongoose.Model<IUser>).findByIdAndUpdate(
      this._id,
      {
        $push: {
          notifications: {
            $each: [notification],
            $position: 0,
            $slice: 200,
          },
        },
      },
      { new: true, lean: true }
    );

    try {
      const [{ Channels, Events }, { publishToChannel }, { redisUtils }] = await Promise.all([
        import('../../lib/ably/events'),
        import('../../lib/ably/publisher'),
        import('../../lib/redis'),
      ]);

      const userId = String(this._id ?? '');
      if (userId) {
        await Promise.allSettled([
          redisUtils.invalidatePattern(`notifications:${userId}:*`),
          redisUtils.del(`notifications_cache:${userId}`),
        ]);
        await publishToChannel(Channels.user(userId), Events.user.notificationSent, {
          notificationId,
          type,
          title,
          message,
          link:
            typeof notification.data?.actionUrl === 'string'
              ? notification.data.actionUrl
              : undefined,
          createdAt: createdAt.toISOString(),
        });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to publish realtime notification');
    }

    return (updateResult ?? this) as IUser;
  };

  schema.methods.updateRating = async function (newRating: number): Promise<IUser> {
    const safeRating = Math.max(1, Math.min(5, Number(newRating) || 0));
    const currentCount = this.rating?.count ?? 0;
    const currentAverage = this.rating?.average ?? 0;
    const nextCount = currentCount + 1;
    const nextAverage = (currentAverage * currentCount + safeRating) / nextCount;

    if (!this.rating) this.rating = { average: 0, count: 0, distribution: {} };
    this.rating.average = Number(nextAverage.toFixed(2));
    this.rating.count = nextCount;

    const distribution: Record<number, number> = (this.rating.distribution as Record<number, number>) ?? {};
    distribution[safeRating] = (distribution[safeRating] ?? 0) + 1;
    this.rating.distribution = distribution;

    this.markModified('rating');
    return this.save();
  };
}
