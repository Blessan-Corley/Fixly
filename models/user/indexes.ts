import mongoose from 'mongoose';

import type { IUser } from '../../types/User';
import type { IUserModel } from './types';

export function addUserIndexes(schema: mongoose.Schema<IUser, IUserModel>): void {
  schema.index({ username: 1 });
  schema.index({ role: 1, createdAt: -1 });
  schema.index({ role: 1, isActive: 1, banned: 1 });
  // Compound index for findMatchingFixers(): filters role + active/unbanned fixers by skill
  schema.index({ role: 1, skills: 1, isActive: 1, banned: 1 });
  schema.index({ 'location.city': 1, role: 1 });
  schema.index({ 'verification.status': 1, role: 1 });
  schema.index({ 'plan.status': 1, role: 1 });
  schema.index({ lastActivityAt: -1 });
  schema.index({ lastLoginAt: -1 });
}
