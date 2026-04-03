import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import type { IUser, UserRole } from '../../types/User';
import { hasRoleMutation } from './helpers';
import type { IUserModel } from './types';

export function addUserHooks(schema: mongoose.Schema<IUser, IUserModel>): void {
  schema.pre('save', async function (next) {
    try {
      if (!this.isNew && this.isModified('role')) {
        const existingUser = await (this.constructor as IUserModel)
          .findById(this._id)
          .select('role')
          .lean<{ role?: UserRole } | null>();

        if (existingUser?.role && this.role && existingUser.role !== this.role) {
          return next(new Error('Role cannot be changed once the account is created'));
        }
      }

      if (this.isModified('passwordHash') && this.passwordHash) {
        if (!/^\$2[aby]\$\d{2}\$/.test(this.passwordHash)) {
          this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
        }
      }
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  schema.pre('findOneAndUpdate', function (next) {
    if (hasRoleMutation(this.getUpdate())) {
      return next(new Error('Role updates are not allowed after account creation'));
    }
    next();
  });

  schema.pre('updateOne', function (next) {
    if (hasRoleMutation(this.getUpdate())) {
      return next(new Error('Role updates are not allowed after account creation'));
    }
    next();
  });
}
