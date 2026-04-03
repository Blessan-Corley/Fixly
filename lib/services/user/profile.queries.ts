// Phase 2: Added a dedicated writable profile lookup so mutations do not operate on lean documents.
import type { SessionUser, UserDocument } from '@/lib/services/user/profile.schema';
import { isMongoObjectId, toTrimmedString } from '@/lib/services/user/profile.schema';
import User from '@/models/User';

const GOOGLE_USER_SELECT = `
  name
  username
  email
  phone
  role
  profilePhoto
  isRegistered
  isVerified
  emailVerified
  phoneVerified
  authMethod
  picture
  location
  locationHistory
  skills
  rating
  jobsCompleted
  totalEarnings
  privacy
  preferences
  notifications
  banned
  isActive
  lastLoginAt
  createdAt
  plan
  firebaseUid
  lastLocationUpdate
  bio
  availableNow
  serviceRadius
`;

const DEFAULT_USER_SELECT = `
  name
  username
  email
  phone
  role
  profilePhoto
  picture
  isRegistered
  banned
  location
  locationHistory
  skills
  rating
  jobsCompleted
  totalEarnings
  plan
  notifications
  preferences
  createdAt
  lastLoginAt
  authMethod
  emailVerified
  phoneVerified
  googleId
  firebaseUid
  lastLocationUpdate
  bio
  availableNow
  serviceRadius
`;

export async function getCurrentUser(
  session: { user?: SessionUser } | null
): Promise<{
  user: UserDocument | null;
  userId: string | null;
  sessionEmail: string | null;
}> {
  const userId = toTrimmedString(session?.user?.id);
  const sessionEmail = toTrimmedString(session?.user?.email);

  if (!userId) {
    return { user: null, userId: null, sessionEmail };
  }

  const isGoogleUser = !isMongoObjectId(userId);

  let user: UserDocument | null;
  if (isGoogleUser) {
    user = (await User.findOne({ googleId: userId })
      .select(GOOGLE_USER_SELECT)
      .lean()) as UserDocument | null;
  } else {
    user = (await User.findById(userId).select(DEFAULT_USER_SELECT).lean()) as UserDocument | null;
  }

  if (!user && sessionEmail) {
    user = (await User.findOne({ email: sessionEmail })
      .select(DEFAULT_USER_SELECT)
      .lean()) as UserDocument | null;
  }

  return { user, userId, sessionEmail };
}

export async function getCurrentUserDocument(
  session: { user?: SessionUser } | null
): Promise<{
  user: UserDocument | null;
  userId: string | null;
  sessionEmail: string | null;
}> {
  const userId = toTrimmedString(session?.user?.id);
  const sessionEmail = toTrimmedString(session?.user?.email);

  if (!userId) {
    return { user: null, userId: null, sessionEmail };
  }

  const isGoogleUser = !isMongoObjectId(userId);

  let user: UserDocument | null;
  if (isGoogleUser) {
    user = await User.findOne({ googleId: userId }).select(GOOGLE_USER_SELECT);
  } else {
    user = await User.findById(userId).select(DEFAULT_USER_SELECT);
  }

  if (!user && sessionEmail) {
    user = await User.findOne({ email: sessionEmail }).select(DEFAULT_USER_SELECT);
  }

  return { user, userId, sessionEmail };
}

export async function getUserById(userId: string): Promise<{
  _id: string;
  email?: string;
  name?: string;
  role?: string;
  profileComplete: boolean;
} | null> {
  const user = await User.findById(userId)
    .select('email name role profileCompletedAt bio username skills location')
    .lean<{
      _id: { toString(): string };
      email?: string;
      name?: string;
      role?: string;
      profileCompletedAt?: Date;
      bio?: string;
      username?: string;
      skills?: string[];
      location?: unknown;
    } | null>();

  if (!user) {
    return null;
  }

  const profileComplete =
    Boolean(user.profileCompletedAt) ||
    Boolean(user.bio?.trim()) ||
    Boolean(user.username?.trim()) ||
    Boolean(user.location) ||
    (Array.isArray(user.skills) && user.skills.length > 0);

  return {
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    profileComplete,
  };
}

export async function getAdminUsers(): Promise<Array<{ _id: string; email?: string; name?: string }>> {
  const admins = await User.find({ role: { $in: ['admin', 'moderator'] } })
    .select('_id email name')
    .lean<Array<{ _id: { toString(): string }; email?: string; name?: string }>>();

  return admins.map((admin) => ({
    _id: admin._id.toString(),
    email: admin.email,
    name: admin.name,
  }));
}
