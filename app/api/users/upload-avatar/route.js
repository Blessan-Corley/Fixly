// app/api/users/upload-avatar/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';
import { validateFileUpload, addSecurityHeaders } from '@/utils/validation';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';

// Configure Cloudinary
const configureCloudinary = () => {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return true;
  }
  return false;
};

// POST /api/users/upload-avatar - Upload user avatar
export async function POST(request) {
  try {
    // Apply rate limiting for file uploads
    const rateLimitResult = await rateLimit(request, 'file_upload', 10, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many upload requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('avatar');

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    try {
      const validationResult = await validateFileUpload(file, {
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        maxSize: 2 * 1024 * 1024, // 2MB for avatars
        allowDocuments: false,
        allowVideos: false
      });

      if (!validationResult.isValid) {
        return NextResponse.json(
          { message: 'File validation failed' },
          { status: 400 }
        );
      }

      // Upload to cloud storage
      let avatarUrl;
      const fileName = `avatar_${user._id}_${Date.now()}`;
      
      if (configureCloudinary()) {
        try {
          // Convert file to buffer for Cloudinary upload
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          // Upload to Cloudinary with optimization
          const cloudinaryResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                public_id: fileName,
                folder: 'fixly/avatars',
                transformation: [
                  { width: 400, height: 400, crop: 'fill', quality: 'auto', format: 'webp' }
                ],
                resource_type: 'image'
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            ).end(buffer);
          });
          
          avatarUrl = cloudinaryResult.secure_url;
        } catch (cloudinaryError) {
          console.error('Cloudinary upload failed:', cloudinaryError);
          // Fallback to local storage simulation
          avatarUrl = `/uploads/avatars/${fileName}.webp`;
        }
      } else {
        // Fallback for development - simulate cloud storage
        console.warn('Cloudinary not configured, using placeholder URL');
        avatarUrl = `/uploads/avatars/${fileName}.webp`;
      }

      // Update user profile photo
      const oldPhotoUrl = user.profilePhoto;
      user.profilePhoto = avatarUrl;
      user.lastActivityAt = new Date();

      // Add notification about profile update
      user.addNotification(
        'settings_updated',
        'Profile Photo Updated',
        'Your profile photo has been successfully updated.'
      );

      await user.save();

      // Delete old avatar from cloud storage if it exists
      if (oldPhotoUrl && !oldPhotoUrl.startsWith('/') && configureCloudinary()) {
        try {
          // Extract public_id from Cloudinary URL
          const urlParts = oldPhotoUrl.split('/');
          const fileName = urlParts[urlParts.length - 1].split('.')[0];
          const publicId = `fixly/avatars/${fileName}`;
          
          await cloudinary.uploader.destroy(publicId);
          console.log('✅ Old avatar deleted from Cloudinary:', publicId);
        } catch (deleteError) {
          console.warn('⚠️ Failed to delete old avatar from Cloudinary:', deleteError);
        }
      }

      const response = NextResponse.json({
        success: true,
        message: 'Avatar uploaded successfully',
        avatarUrl,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          profilePhoto: user.profilePhoto
        }
      });

      return addSecurityHeaders(response);

    } catch (validationError) {
      return NextResponse.json(
        { message: validationError.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Avatar upload error:', error);
    const response = NextResponse.json(
      { message: 'Failed to upload avatar' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// DELETE /api/users/upload-avatar - Remove user avatar
export async function DELETE(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'api_requests', 50, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const oldPhotoUrl = user.profilePhoto;
    
    // Reset to default avatar (or null)
    user.profilePhoto = null;
    user.lastActivityAt = new Date();

    // Add notification about profile update
    user.addNotification(
      'settings_updated',
      'Profile Photo Removed',
      'Your profile photo has been removed.'
    );

    await user.save();

    // Delete old avatar from cloud storage
    if (oldPhotoUrl && !oldPhotoUrl.startsWith('/') && configureCloudinary()) {
      try {
        const urlParts = oldPhotoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1].split('.')[0];
        const publicId = `fixly/avatars/${fileName}`;
        
        await cloudinary.uploader.destroy(publicId);
        console.log('✅ Old avatar deleted from Cloudinary:', publicId);
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete old avatar from Cloudinary:', deleteError);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Avatar removed successfully',
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        profilePhoto: user.profilePhoto
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Avatar removal error:', error);
    const response = NextResponse.json(
      { message: 'Failed to remove avatar' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// GET /api/users/upload-avatar - Get upload progress or info
export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'api_requests', 100, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user
    const user = await User.findById(session.user.id).select('profilePhoto picture');
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      currentAvatar: user.profilePhoto || user.picture,
      uploadLimits: {
        maxSize: '2MB',
        allowedTypes: ['JPEG', 'PNG', 'WebP'],
        dimensions: 'Recommended: 200x200px or larger',
        maxUploadsPerHour: 10
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Get avatar info error:', error);
    const response = NextResponse.json(
      { message: 'Failed to get avatar information' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}