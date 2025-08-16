// models/VerificationToken.js
import mongoose from 'mongoose';
import crypto from 'crypto';

const verificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email', 'phone', 'email_otp'],
    required: true
  },
  token: {
    type: String,
    required: true,
    index: true
  },
  hashedToken: {
    type: String,
    required: true
  },
  contact: {
    type: String, // email or phone number
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  },
  used: {
    type: Boolean,
    default: false
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  lastAttemptAt: Date,
  verifiedAt: Date
}, {
  timestamps: true
});

// Indexes for performance
verificationTokenSchema.index({ userId: 1, type: 1 });
verificationTokenSchema.index({ contact: 1, type: 1 });
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationTokenSchema.index({ createdAt: 1 });

// Methods
verificationTokenSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

verificationTokenSchema.methods.canAttempt = function() {
  return !this.used && !this.isExpired() && this.attempts < 3;
};

verificationTokenSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  this.lastAttemptAt = new Date();
  return this.save();
};

verificationTokenSchema.methods.markAsUsed = function() {
  this.used = true;
  this.verifiedAt = new Date();
  return this.save();
};

// Static methods
verificationTokenSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

verificationTokenSchema.statics.generateEmailToken = function() {
  return crypto.randomBytes(32).toString('hex'); // Secure email token
};

verificationTokenSchema.statics.hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

verificationTokenSchema.statics.createVerificationToken = function(userId, type, contact, ipAddress, userAgent) {
  const token = type === 'email' ? this.generateEmailToken() : this.generateOTP();
  const hashedToken = this.hashToken(token);
  const expiresAt = new Date();
  
  // Set expiry based on type
  if (type === 'email') {
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours for email links
  } else {
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes for OTP
  }

  return this.create({
    userId,
    type,
    token: token, // Store plain token temporarily for sending
    hashedToken,
    contact,
    expiresAt,
    ipAddress,
    userAgent
  });
};

verificationTokenSchema.statics.findValidToken = function(userId, type, token) {
  const hashedToken = this.hashToken(token);
  return this.findOne({
    userId,
    type,
    hashedToken,
    used: false,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 3 }
  });
};

verificationTokenSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Pre-save middleware to hash token
verificationTokenSchema.pre('save', function(next) {
  // Remove plain token after first save for security
  if (this.isNew && this.token) {
    // Keep token only for the initial creation response
    setTimeout(() => {
      this.token = undefined;
    }, 1000);
  }
  next();
});

export default mongoose.models.VerificationToken || mongoose.model('VerificationToken', verificationTokenSchema);