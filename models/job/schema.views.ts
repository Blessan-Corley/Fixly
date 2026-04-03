import mongoose from 'mongoose';

export const viewsDefinition = {
  count: {
    type: Number,
    default: 0,
  },
  uniqueViewers: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
      ipAddress: String,
      userAgent: String,
    },
  ],
  dailyViews: [
    {
      date: {
        type: String,
        required: true,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  ],
};

export const likesDefinition = [
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likedAt: {
      type: Date,
      default: Date.now,
    },
  },
];
