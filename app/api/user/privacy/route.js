// app/api/user/privacy/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function PUT(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'privacy_update', 10, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { privacy } = body;

    if (!privacy || typeof privacy !== 'object') {
      return NextResponse.json(
        { message: 'Privacy settings are required' },
        { status: 400 }
      );
    }

    const {
      profileVisibility,
      showPhone,
      showEmail,
      showLocation,
      showRating,
      allowReviews,
      allowMessages,
      dataSharingConsent
    } = privacy;

    // Validation
    const validationErrors = [];

    // Profile visibility validation
    if (profileVisibility !== undefined) {
      const validVisibilities = ['public', 'verified', 'private'];
      if (!validVisibilities.includes(profileVisibility)) {
        validationErrors.push('Invalid profile visibility setting');
      }
    }

    // Boolean field validation
    const booleanFields = {
      showPhone: 'Show phone number',
      showEmail: 'Show email address',
      showLocation: 'Show location',
      showRating: 'Show rating',
      allowReviews: 'Allow reviews',
      allowMessages: 'Allow messages',
      dataSharingConsent: 'Data sharing consent'
    };

    Object.entries(booleanFields).forEach(([field, label]) => {
      const value = privacy[field];
      if (value !== undefined && typeof value !== 'boolean') {
        validationErrors.push(`${label} must be true or false`);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { message: 'Validation errors', errors: validationErrors },
        { status: 400 }
      );
    }

    // Prepare privacy update object
    const privacyUpdate = {};

    if (profileVisibility !== undefined) privacyUpdate.profileVisibility = profileVisibility;
    if (showPhone !== undefined) privacyUpdate.showPhone = Boolean(showPhone);
    if (showEmail !== undefined) privacyUpdate.showEmail = Boolean(showEmail);
    if (showLocation !== undefined) privacyUpdate.showLocation = Boolean(showLocation);
    if (showRating !== undefined) privacyUpdate.showRating = Boolean(showRating);
    if (allowReviews !== undefined) privacyUpdate.allowReviews = Boolean(allowReviews);
    if (allowMessages !== undefined) privacyUpdate.allowMessages = Boolean(allowMessages);
    if (dataSharingConsent !== undefined) privacyUpdate.dataSharingConsent = Boolean(dataSharingConsent);

    // Update user privacy settings
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { 
        privacy: {
          ...user.privacy,
          ...privacyUpdate
        }
      },
      { new: true, runValidators: true }
    );

    // Add notification about privacy settings update
    await updatedUser.addNotification(
      'privacy_updated',
      'Privacy Settings Updated',
      'Your privacy settings have been successfully updated.'
    );

    // Log privacy changes for audit (in production, you might want detailed logging)
    console.log(`Privacy settings updated for user ${session.user.id}:`, {
      userId: session.user.id,
      changes: privacyUpdate,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Privacy settings updated successfully',
      user: {
        id: updatedUser._id,
        privacy: updatedUser.privacy
      }
    });

  } catch (error) {
    console.error('Privacy settings update error:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: 'Validation error', errors: Object.values(error.errors).map(e => e.message) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Return current privacy settings with defaults
    const privacySettings = {
      profileVisibility: user.privacy?.profileVisibility || 'public',
      showPhone: user.privacy?.showPhone ?? true,
      showEmail: user.privacy?.showEmail ?? false,
      showLocation: user.privacy?.showLocation ?? true,
      showRating: user.privacy?.showRating ?? true,
      allowReviews: user.privacy?.allowReviews ?? true,
      allowMessages: user.privacy?.allowMessages ?? true,
      dataSharingConsent: user.privacy?.dataSharingConsent ?? false
    };

    return NextResponse.json({
      success: true,
      privacy: privacySettings
    });

  } catch (error) {
    console.error('Get privacy settings error:', error);
    return NextResponse.json(
      { message: 'Failed to get privacy settings' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // For account deletion, we might want to:
    // 1. Mark account as deleted instead of actually deleting
    // 2. Anonymize user data
    // 3. Cancel subscriptions
    // 4. Send confirmation email

    const { confirmDelete } = await request.json();

    if (confirmDelete !== 'DELETE_MY_ACCOUNT') {
      return NextResponse.json(
        { message: 'Account deletion must be confirmed with "DELETE_MY_ACCOUNT"' },
        { status: 400 }
      );
    }

    // Mark account for deletion (soft delete)
    const deletedUser = await User.findByIdAndUpdate(
      session.user.id,
      { 
        deletedAt: new Date(),
        isActive: false,
        email: `deleted_${Date.now()}@deleted.local`, // Anonymize email
        phone: null,
        name: 'Deleted User'
      },
      { new: true }
    );

    // Log account deletion for audit
    console.log(`Account deletion requested for user ${session.user.id}:`, {
      userId: session.user.id,
      deletedAt: new Date().toISOString(),
      email: user.email
    });

    // In production, you might want to:
    // - Send deletion confirmation email
    // - Queue background job to fully delete data after 30 days
    // - Cancel any active subscriptions
    // - Remove user from all jobs/applications

    return NextResponse.json({
      success: true,
      message: 'Account has been scheduled for deletion. You have 30 days to reactivate if needed.'
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { message: 'Failed to delete account' },
      { status: 500 }
    );
  }
}