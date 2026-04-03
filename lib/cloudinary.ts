import { v2 as cloudinary } from 'cloudinary';

import { env } from '@/lib/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

export const UPLOAD_PRESETS = {
  jobMedia: {
    folder: 'fixly/jobs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
    max_bytes: 50 * 1024 * 1024,
    resource_type: 'auto' as const,
  },
  profilePhoto: {
    folder: 'fixly/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    max_bytes: 5 * 1024 * 1024,
    resource_type: 'image' as const,
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
  document: {
    folder: 'fixly/documents',
    allowed_formats: ['pdf', 'doc', 'docx'],
    max_bytes: 10 * 1024 * 1024,
    resource_type: 'raw' as const,
  },
} as const;
