import mongoose from 'mongoose';

import type { IUser } from '../../types/User';
import type { IUserModel } from './types';

export function addUserStatics(schema: mongoose.Schema<IUser, IUserModel>): void {
  schema.statics.findByEmail = function (email: string) {
    return this.findOne({ email: email.toLowerCase() });
  };

  schema.statics.findByGoogleId = function (googleId: string) {
    return this.findOne({ googleId });
  };

  schema.statics.findByEmailOrGoogleId = function (email: string, googleId?: string) {
    const query: Record<string, unknown>[] = [{ email: email.toLowerCase() }];
    if (googleId) query.push({ googleId });
    return this.findOne({ $or: query });
  };

  schema.statics.findByPhone = function (phone: string) {
    return this.findOne({ phone });
  };
}
