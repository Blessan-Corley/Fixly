import { Schema } from 'mongoose';

import type { JobDocument } from './types';

export const MessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message sender is required'],
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [1, 'Message cannot be empty'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    attachments: [
      {
        url: {
          type: String,
          required: [true, 'Attachment URL is required'],
          validate: {
            validator: function (_this: JobDocument, url: string) {
              const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|pdf|doc|docx)$/i;
              return urlRegex.test(url);
            },
            message: 'Please provide a valid file URL',
          },
        },
        filename: {
          type: String,
          required: [true, 'Filename is required'],
          maxlength: [100, 'Filename cannot exceed 100 characters'],
        },
        fileType: {
          type: String,
          enum: {
            values: ['image', 'document'],
            message: 'Invalid file type',
          },
        },
      },
    ],
    sentAt: {
      type: Date,
      default: Date.now,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

export const jobMessagesField = [MessageSchema];
