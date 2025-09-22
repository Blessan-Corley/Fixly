// app/api/user/profile-photo/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { redisRateLimit } from '../../../../lib/redis';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Apply Redis-based rate limiting - 1 profile photo update per 7 days per user
    const rateLimitResult = await redisRateLimit(`profile_photo:${session.user.id}`, 1, 7 * 24 * 3600); // 7 days
    if (!rateLimitResult.success) {
      const resetTime = new Date(rateLimitResult.resetTime || Date.now() + 7 * 24 * 60 * 60 * 1000);
      return NextResponse.json(
        {
          message: 'You can only update your profile photo once every 7 days.',
          resetTime: resetTime.toISOString(),
          daysRemaining: Math.ceil((resetTime.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        },
        { status: 429 }
      );
    }

    await connectDB();

    // Find current user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user can update profile photo (once every 7 days)
    const lastPhotoUpdate = user.profilePhoto?.lastUpdated;
    if (lastPhotoUpdate) {
      const daysSinceLastUpdate = Math.floor(
        (Date.now() - new Date(lastPhotoUpdate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastUpdate < 7) {
        return NextResponse.json(
          {
            message: `You can only update your profile photo once every 7 days. Please wait ${7 - daysSinceLastUpdate} more days.`,
            nextUpdateDate: new Date(new Date(lastPhotoUpdate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            daysRemaining: 7 - daysSinceLastUpdate
          },
          { status: 429 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Only JPEG, PNG, and WebP images are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      // Delete old profile photo from Cloudinary if exists
      if (user.profilePhoto?.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(user.profilePhoto.cloudinaryPublicId);
      }

      // Upload new profile photo to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: `fixly/profiles/${user._id}`,
            public_id: `profile_${user._id}_${Date.now()}`,
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto:good' },
              { format: 'auto' }
            ],
            overwrite: true,
            tags: ['profile', 'user_upload']
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      // Update user profile photo information
      user.profilePhoto = {
        url: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        lastUpdated: new Date(),
        originalName: file.name,
        fileSize: file.size,
        dimensions: {
          width: uploadResult.width,
          height: uploadResult.height
        }
      };

      await user.save();

      // Add notification
      await user.addNotification(
        'profile_updated',
        'Profile Photo Updated',
        'Your profile photo has been updated successfully.'
      );

      return NextResponse.json({
        success: true,
        message: 'Profile photo updated successfully',
        profilePhoto: {
          url: uploadResult.secure_url,
          lastUpdated: user.profilePhoto.lastUpdated,
          nextUpdateDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return NextResponse.json(
        { message: 'Failed to upload profile photo' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Profile photo update error:', error);
    return NextResponse.json(
      {
        message: 'Failed to update profile photo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}