// app/api/jobs/upload-media/route.js - Job Media Upload with Photo/Video Limits
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { redisRateLimit } from '../../../../lib/redis';
import { v2 as cloudinary } from 'cloudinary';
import { ContentValidator } from '../../../../lib/validations/content-validator';
import { FileValidator } from '../../../../lib/fileValidation';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Redis-based rate limiting - 20 uploads per hour per IP
    const rateLimitResult = await redisRateLimit(`job_media_upload:${ip}`, 20, 3600);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many upload requests. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const existingPhotos = parseInt(formData.get('existingPhotos') || '0');
    const existingVideos = parseInt(formData.get('existingVideos') || '0');

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Determine file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, message: 'Only images and videos are allowed' },
        { status: 400 }
      );
    }

    // Check limits
    if (isImage && existingPhotos >= 5) {
      return NextResponse.json(
        { success: false, message: 'Maximum 5 photos allowed' },
        { status: 400 }
      );
    }

    if (isVideo && existingVideos >= 1) {
      return NextResponse.json(
        { success: false, message: 'Maximum 1 video allowed' },
        { status: 400 }
      );
    }

    // Comprehensive file validation
    const fileValidation = await FileValidator.validateFile(file, {
      maxImageSize: isImage ? 5 * 1024 * 1024 : undefined, // 5MB for images
      maxVideoSize: isVideo ? 50 * 1024 * 1024 : undefined  // 50MB for videos
    });

    if (!fileValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: fileValidation.errors[0] || 'File validation failed',
          errors: fileValidation.errors,
          securityIssues: fileValidation.securityIssues
        },
        { status: 400 }
      );
    }

    // Log security warnings if any
    if (fileValidation.warnings.length > 0) {
      console.warn('File upload warnings:', fileValidation.warnings);
    }

    // Log security issues for monitoring
    if (fileValidation.securityIssues.length > 0) {
      console.error('File security issues detected:', {
        userId: session.user.id,
        fileName: file.name,
        issues: fileValidation.securityIssues
      });
    }

    // Validate file size
    const maxImageSize = 5 * 1024 * 1024; // 5MB for images
    const maxVideoSize = 50 * 1024 * 1024; // 50MB for videos

    if (isImage && file.size > maxImageSize) {
      return NextResponse.json(
        { success: false, message: 'Image size must be less than 5MB' },
        { status: 400 }
      );
    }

    if (isVideo && file.size > maxVideoSize) {
      return NextResponse.json(
        { success: false, message: 'Video size must be less than 50MB' },
        { status: 400 }
      );
    }

    // Content validation for filename
    const contentValidation = await ContentValidator.validateContent(
      file.name,
      'job_media',
      session.user.id
    );

    if (!contentValidation.isValid) {
      const violations = contentValidation.violations.map(v => v.type).join(', ');
      return NextResponse.json(
        {
          success: false,
          message: `File name contains inappropriate content: ${violations}`,
          suggestions: contentValidation.suggestions
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary with appropriate settings
    const uploadOptions = {
      resource_type: isVideo ? 'video' : 'image',
      folder: `fixly/jobs/${session.user.id}`,
      public_id: `${session.user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      tags: ['job_media', isVideo ? 'video' : 'photo'],
    };

    if (isImage) {
      uploadOptions.transformation = [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { format: 'auto' }
      ];
    } else {
      uploadOptions.transformation = [
        { width: 1280, height: 720, crop: 'limit' },
        { quality: 'auto' },
        { format: 'mp4' }
      ];
    }

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(buffer);
    });

    console.log(`📸 Job media uploaded: ${isVideo ? 'Video' : 'Photo'} for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      media: {
        id: uploadResult.public_id,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        filename: file.name,
        size: file.size,
        type: file.type,
        isImage,
        isVideo,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: uploadResult.duration || null,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Job media upload error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Upload failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint for removing uploaded media
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json(
        { success: false, message: 'Public ID required' },
        { status: 400 }
      );
    }

    // Verify the media belongs to the current user
    if (!publicId.includes(session.user.id)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Delete from Cloudinary
    const deleteResult = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'auto'
    });

    console.log(`🗑️ Job media deleted: ${publicId} for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
      result: deleteResult
    });

  } catch (error) {
    console.error('❌ Job media delete error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Delete failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}