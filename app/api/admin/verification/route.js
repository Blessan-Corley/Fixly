// app/api/admin/verification/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';

export const dynamic = 'force-dynamic';

// Get all pending verification applications
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {
      'verification.status': status
    };

    // Get verification applications
    const applications = await User.find(filter)
      .select('name email phone verification createdAt')
      .sort({ 'verification.submittedAt': -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await User.countDocuments(filter);

    // Transform data for admin view
    const transformedApplications = applications.map(user => ({
      id: user._id,
      applicationId: user.verification.applicationId,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
      documentType: user.verification.documentType,
      status: user.verification.status,
      submittedAt: user.verification.submittedAt,
      additionalInfo: user.verification.additionalInfo,
      documents: user.verification.documents,
      rejectionReason: user.verification.rejectionReason,
      reviewedAt: user.verification.reviewedAt,
      reviewedBy: user.verification.reviewedBy
    }));

    return NextResponse.json({
      success: true,
      applications: transformedApplications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get verification applications error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch verification applications' },
      { status: 500 }
    );
  }
}

// Approve or reject verification
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const { userId, action, rejectionReason } = await request.json();

    if (!userId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { message: 'Valid user ID and action (approve/reject) are required' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json(
        { message: 'Rejection reason is required when rejecting' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(userId);
    if (!user || !user.verification || user.verification.status !== 'pending') {
      return NextResponse.json(
        { message: 'Valid pending verification application not found' },
        { status: 404 }
      );
    }

    // Update verification status
    if (action === 'approve') {
      user.isVerified = true;
      user.verification.status = 'approved';
      user.verification.reviewedAt = new Date();
      user.verification.reviewedBy = session.user.id;

      // Add success notification
      await user.addNotification(
        'verification_approved',
        'Account Verified Successfully!',
        'Congratulations! Your account has been verified. You now have access to enhanced features and increased visibility.'
      );

    } else if (action === 'reject') {
      user.verification.status = 'rejected';
      user.verification.rejectionReason = rejectionReason;
      user.verification.reviewedAt = new Date();
      user.verification.reviewedBy = session.user.id;

      // Add rejection notification
      await user.addNotification(
        'verification_rejected',
        'Verification Application Rejected',
        `Your verification application has been rejected. Reason: ${rejectionReason}. You can submit a new application after 7 days.`
      );
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: `Verification ${action}ed successfully`,
      status: user.verification.status
    });

  } catch (error) {
    console.error('Update verification status error:', error);
    return NextResponse.json(
      { message: 'Failed to update verification status' },
      { status: 500 }
    );
  }
}