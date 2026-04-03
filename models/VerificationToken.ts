// models/VerificationToken.ts
import crypto from 'crypto';

import mongoose, { type Model } from 'mongoose';

type VerificationType = 'email' | 'phone' | 'email_otp';

interface VerificationTokenMethods {
  isExpired(): boolean;
  canAttempt(): boolean;
  incrementAttempts(): Promise<VerificationTokenDocument>;
  markAsUsed(): Promise<VerificationTokenDocument>;
}

interface VerificationToken {
  userId: mongoose.Types.ObjectId | string;
  type: VerificationType;
  token: string;
  hashedToken: string;
  contact: string;
  expiresAt: Date;
  attempts: number;
  used: boolean;
  ipAddress: string;
  userAgent?: string;
  lastAttemptAt?: Date;
  verifiedAt?: Date;
}

type VerificationTokenDocument = mongoose.HydratedDocument<
  VerificationToken,
  VerificationTokenMethods
>;

interface VerificationTokenModel extends Model<
  VerificationToken,
  object,
  VerificationTokenMethods
> {
  generateOTP(): string;
  generateEmailToken(): string;
  hashToken(token: string): string;
  createVerificationToken(
    userId: string,
    type: VerificationType,
    contact: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<VerificationTokenDocument>;
  findValidToken(
    userId: string,
    type: VerificationType,
    token: string
  ): Promise<VerificationTokenDocument | null>;
  cleanupExpired(): Promise<{ deletedCount?: number }>;
}

const verificationTokenSchema = new mongoose.Schema<
  VerificationToken,
  VerificationTokenModel,
  VerificationTokenMethods
>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['email', 'phone', 'email_otp'],
      required: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    hashedToken: {
      type: String,
      required: true,
    },
    contact: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 3,
    },
    used: {
      type: Boolean,
      default: false,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: String,
    lastAttemptAt: Date,
    verifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

verificationTokenSchema.index({ userId: 1, type: 1 });
verificationTokenSchema.index({ contact: 1, type: 1 });
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationTokenSchema.index({ createdAt: 1 });

verificationTokenSchema.methods.isExpired = function (this: VerificationTokenDocument) {
  return new Date() > this.expiresAt;
};

verificationTokenSchema.methods.canAttempt = function (this: VerificationTokenDocument) {
  return !this.used && !this.isExpired() && this.attempts < 3;
};

verificationTokenSchema.methods.incrementAttempts = function (this: VerificationTokenDocument) {
  this.attempts += 1;
  this.lastAttemptAt = new Date();
  return this.save();
};

verificationTokenSchema.methods.markAsUsed = function (this: VerificationTokenDocument) {
  this.used = true;
  this.verifiedAt = new Date();
  return this.save();
};

verificationTokenSchema.statics.generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

verificationTokenSchema.statics.generateEmailToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

verificationTokenSchema.statics.hashToken = function (token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

verificationTokenSchema.statics.createVerificationToken = function (
  this: VerificationTokenModel,
  userId: string,
  type: VerificationType,
  contact: string,
  ipAddress: string,
  userAgent?: string
) {
  const token = type === 'email' ? this.generateEmailToken() : this.generateOTP();
  const hashedToken = this.hashToken(token);
  const expiresAt = new Date();

  if (type === 'email') {
    expiresAt.setHours(expiresAt.getHours() + 24);
  } else {
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
  }

  return this.create({
    userId,
    type,
    token,
    hashedToken,
    contact,
    expiresAt,
    ipAddress,
    userAgent,
  });
};

verificationTokenSchema.statics.findValidToken = function (
  this: VerificationTokenModel,
  userId: string,
  type: VerificationType,
  token: string
) {
  const hashedToken = this.hashToken(token);
  return this.findOne({
    userId,
    type,
    hashedToken,
    used: false,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 3 },
  });
};

verificationTokenSchema.statics.cleanupExpired = function (this: VerificationTokenModel) {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

verificationTokenSchema.post('save', function (doc: VerificationTokenDocument) {
  if (doc.token) {
    (doc as Partial<VerificationTokenDocument>).token = undefined;
  }
});

export default (mongoose.models.VerificationToken as VerificationTokenModel) ||
  mongoose.model<VerificationToken, VerificationTokenModel>(
    'VerificationToken',
    verificationTokenSchema
  );
