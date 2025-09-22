// app/api/user/verification/apply/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/db';
import User from '../../../../../models/User';
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

    await connectDB();

    const formData = await request.formData();
    const documentType = formData.get('documentType');
    const additionalInfo = formData.get('additionalInfo');
    const documents = formData.getAll('documents');

    if (!documentType || documents.length === 0) {
      return NextResponse.json(
        { message: 'Document type and at least one document are required' },
        { status: 400 }
      );
    }

    // Find current user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already verified
    if (user.isVerified) {
      return NextResponse.json(
        { message: 'Account is already verified' },
        { status: 400 }
      );
    }

    // Check if user has pending verification
    if (user.verification?.status === 'pending') {
      return NextResponse.json(
        { message: 'You already have a pending verification application' },
        { status: 400 }
      );
    }

    // Check if user can apply (once every 7 days)
    const lastApplication = user.verification?.lastApplicationDate;
    if (lastApplication) {
      const daysSinceLastApplication = Math.floor(
        (Date.now() - new Date(lastApplication).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastApplication < 7) {
        return NextResponse.json(
          {
            message: `You can only apply for verification once every 7 days. Please wait ${7 - daysSinceLastApplication} more days.`
          },
          { status: 400 }
        );
      }
    }

    // Validate documents
    if (documents.length > 3) {
      return NextResponse.json(
        { message: 'Maximum 3 documents allowed' },
        { status: 400 }
      );
    }

    // Upload documents to Cloudinary
    const uploadedDocuments = [];

    for (const document of documents) {
      // Check file size (5MB max)
      if (document.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { message: `File ${document.name} is too large. Maximum size is 5MB.` },
          { status: 400 }
        );
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(document.type)) {
        return NextResponse.json(
          { message: `File ${document.name} has invalid format. Only JPG, PNG, and PDF are allowed.` },
          { status: 400 }
        );
      }

      try {
        // Convert file to base64
        const bytes = await document.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const dataUri = `data:${document.type};base64,${base64}`;

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(dataUri, {
          folder: `verification/${user._id}`,
          resource_type: 'auto',
          public_id: `${Date.now()}_${document.name.split('.')[0]}`,
          overwrite: true,
          tags: ['verification', 'document']
        });

        uploadedDocuments.push({
          originalName: document.name,
          cloudinaryUrl: uploadResult.secure_url,
          cloudinaryPublicId: uploadResult.public_id,
          fileType: document.type,
          fileSize: document.size,
          uploadedAt: new Date()
        });
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return NextResponse.json(
          { message: `Failed to upload ${document.name}` },
          { status: 500 }
        );
      }
    }

    // Create verification application
    const verificationApplication = {
      status: 'pending',
      documentType,
      documents: uploadedDocuments,
      additionalInfo: additionalInfo || '',
      submittedAt: new Date(),
      lastApplicationDate: new Date(),
      applicationId: `VER_${user._id}_${Date.now()}`
    };

    // Update user with verification data
    user.verification = verificationApplication;
    await user.save();

    // Add notification
    await user.addNotification(
      'verification_submitted',
      'Verification Application Submitted',
      'Your verification documents have been submitted and are under review. We will notify you within 3-5 business days.'
    );

    // TODO: Notify admin about new verification application
    // This could be done via email or adding to an admin queue

    return NextResponse.json({
      success: true,
      message: 'Verification application submitted successfully',
      applicationId: verificationApplication.applicationId
    });

  } catch (error) {
    console.error('Verification application error:', error);
    return NextResponse.json(
      {
        message: 'Failed to submit verification application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}