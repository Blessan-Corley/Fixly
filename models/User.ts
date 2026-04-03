import mongoose from 'mongoose';

import { addUserHooks } from './user/hooks';
import { addUserIndexes } from './user/indexes';
import { addUserMethods } from './user/methods';
import { userSchema } from './user/schema';
import { addUserStatics } from './user/statics';
import type { IUserModel } from './user/types';

addUserIndexes(userSchema);
addUserMethods(userSchema);
addUserStatics(userSchema);
addUserHooks(userSchema);

export type { IUserModel } from './user/types';

import type { IUser } from '../types/User';

export default (mongoose.models.User as IUserModel) ||
  mongoose.model<IUser, IUserModel>('User', userSchema);
