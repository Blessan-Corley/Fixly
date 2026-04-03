import { Model } from 'mongoose';

import type { IUser } from '../../types/User';

export interface IUserModel extends Model<IUser> {
  findNearbyFixers(city: string, skills?: string[], radius?: number): Promise<IUser[]>;
  findByGoogleId(googleId: string): Promise<IUser | null>;
  findByEmailOrGoogleId(email: string, googleId?: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByPhone(phone: string): Promise<IUser | null>;
}
