// app/api/user/upload-photo/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Create filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const fileExtension = path.extname(file.name);
    const fileName = `${session.user.id}_${timestamp}${fileExtension}`;
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Save file to disk
    const filePath = path.join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate public URL
    const photoUrl = `/uploads/profiles/${fileName}`;

    // Update user in database
    await connectDB();
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { profilePhoto: photoUrl },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded successfully',
      photoUrl: photoUrl,
      user: {
        id: user._id,
        profilePhoto: user.profilePhoto
      }
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { message: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}

// Alternative implementation using Cloudinary (commented out)
/*
import { v2 as cloudinary } from 'cloudinary';

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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'fixly/profiles',
          public_id: `user_${session.user.id}_${Date.now()}`,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    // Update user in database
    await connectDB();
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { profilePhoto: uploadResponse.secure_url },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded successfully',
      photoUrl: uploadResponse.secure_url,
      user: {
        id: user._id,
        profilePhoto: user.profilePhoto
      }
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { message: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
*/