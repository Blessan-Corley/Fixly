// app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';
import { withErrorHandler, AuthenticationError } from '../../../../lib/errorHandling';
import { cache, analytics } from '../../../../lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'admin_users', 100, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Build query
    const query = {};

    // Search in name, email, username
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by role
    if (role && ['hirer', 'fixer', 'admin'].includes(role)) {
      query.role = role;
    }

    // Filter by status
    if (status === 'banned') {
      query.banned = true;
    } else if (status === 'active') {
      query.banned = false;
    } else if (status === 'verified') {
      query.isVerified = true;
    } else if (status === 'unverified') {
      query.isVerified = false;
    }

    // Sorting
    let sort = {};
    switch (sortBy) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'name':
        sort = { name: 1 };
        break;
      case 'rating':
        sort = { 'rating.average': -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    // Execute query
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -notifications') // Exclude sensitive data
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    // Add computed fields
    const enhancedUsers = users.map(user => ({
      ...user,
      jobsCount: user.role === 'hirer' ? user.jobsPosted : user.jobsCompleted,
      memberSince: user.createdAt,
      lastActive: user.lastLoginAt || user.createdAt,
      isPro: user.plan?.type === 'pro' && user.plan?.status === 'active'
    }));

    return NextResponse.json({
      users: enhancedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total
      },
      filters: {
        search,
        role,
        status,
        sortBy
      }
    });

  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'admin_user_action', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, userIds, reason } = body;

    if (!action || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { message: 'Action and user IDs are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const validActions = ['ban', 'unban', 'verify', 'unverify', 'delete'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { message: 'Invalid action' },
        { status: 400 }
      );
    }

    let updateQuery = {};
    let successMessage = '';

    switch (action) {
      case 'ban':
        updateQuery = { 
          banned: true, 
          bannedReason: reason || 'Banned by admin' 
        };
        successMessage = 'Users banned successfully';
        break;
      case 'unban':
        updateQuery = { 
          banned: false, 
          $unset: { bannedReason: 1 } 
        };
        successMessage = 'Users unbanned successfully';
        break;
      case 'verify':
        updateQuery = { isVerified: true };
        successMessage = 'Users verified successfully';
        break;
      case 'unverify':
        updateQuery = { isVerified: false };
        successMessage = 'Users unverified successfully';
        break;
      case 'delete':
        // For MVP, we'll just ban instead of actual deletion
        updateQuery = { 
          banned: true, 
          bannedReason: 'Account deleted by admin' 
        };
        successMessage = 'Users deleted successfully';
        break;
    }

    // Prevent admins from acting on other admin accounts
    const targetUsers = await User.find({ 
      _id: { $in: userIds },
      role: { $ne: 'admin' }
    });

    if (targetUsers.length !== userIds.length) {
      return NextResponse.json(
        { message: 'Cannot perform action on admin accounts or invalid user IDs' },
        { status: 400 }
      );
    }

    // Perform the action
    const result = await User.updateMany(
      { 
        _id: { $in: userIds },
        role: { $ne: 'admin' }
      },
      updateQuery
    );

    return NextResponse.json({
      success: true,
      message: successMessage,
      affectedUsers: result.modifiedCount
    });

  } catch (error) {
    console.error('Admin user action error:', error);
    return NextResponse.json(
      { message: 'Failed to perform action' },
      { status: 500 }
    );
  }
}