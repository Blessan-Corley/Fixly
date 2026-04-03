export const attachmentDefinition = {
  id: {
    type: String,
    required: [true, 'Attachment ID is required'],
  },
  url: {
    type: String,
    required: [true, 'Attachment URL is required'],
  },
  publicId: {
    type: String,
    required: [true, 'Cloudinary public ID is required'],
  },
  filename: {
    type: String,
    required: false,
    maxlength: [100, 'Filename cannot exceed 100 characters'],
  },
  type: {
    type: String,
    required: [true, 'File type is required'],
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative'],
  },
  isImage: {
    type: Boolean,
    required: [true, 'Image flag is required'],
  },
  isVideo: {
    type: Boolean,
    required: [true, 'Video flag is required'],
  },
  width: Number,
  height: Number,
  duration: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
};
