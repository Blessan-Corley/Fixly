// app/api/admin/users/[userId]/[action]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export async function POST(request, { params }) {
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

    const { userId, action } = params;

    if (!userId || !action) {
      return NextResponse.json(
        { message: 'User ID and action are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent actions on admin accounts
    if (user.role === 'admin') {
      return NextResponse.json(
        { message: 'Cannot perform actions on admin users' },
        { status: 403 }
      );
    }

    let updateData = {};
    let successMessage = '';

    switch (action) {
      case 'ban':
        updateData = { 
          banned: true, 
          bannedReason: 'Banned by admin',
          bannedAt: new Date(),
          bannedBy: session.user.id
        };
        successMessage = 'User banned successfully';
        break;
      
      case 'unban':
        updateData = { 
          banned: false, 
          $unset: { bannedReason: 1, bannedAt: 1, bannedBy: 1 }
        };
        successMessage = 'User unbanned successfully';
        break;
      
      case 'verify':
        updateData = { 
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: session.user.id
        };
        successMessage = 'User verified successfully';
        break;
      
      case 'unverify':
        updateData = { 
          isVerified: false,
          $unset: { verifiedAt: 1, verifiedBy: 1 }
        };
        successMessage = 'User unverified successfully';
        break;
      
      case 'view':
        // Return detailed user info for admin viewing
        const userDetails = await User.findById(userId)
          .select('-passwordHash') // Exclude password but include everything else for admin
          .populate('notifications', 'type title message createdAt read')
          .lean();
        
        // Add computed stats
        const [jobsPosted, jobsCompleted, totalEarnings] = await Promise.all([
          // For hirers - jobs posted
          user.role === 'hirer' ? 
            require('@/models/Job').countDocuments({ createdBy: userId }) : 0,
          
          // For fixers - jobs completed  
          user.role === 'fixer' ? 
            require('@/models/Job').countDocuments({ assignedTo: userId, status: 'completed' }) : 0,
          
          // For fixers - total earnings
          user.role === 'fixer' ? 
            require('@/models/Job').aggregate([
              { $match: { assignedTo: userId, status: 'completed' } },
              { $group: { _id: null, total: { $sum: '$budget.amount' } } }
            ]).then(result => result[0]?.total || 0) : 0
        ]);

        return NextResponse.json({ 
          success: true,
          user: {
            ...userDetails,
            stats: {
              jobsPosted: user.role === 'hirer' ? jobsPosted : undefined,
              jobsCompleted: user.role === 'fixer' ? jobsCompleted : undefined,
              totalEarnings: user.role === 'fixer' ? totalEarnings : undefined,
              memberSince: userDetails.createdAt,
              lastActive: userDetails.lastLoginAt || userDetails.createdAt,
              notificationCount: userDetails.notifications?.length || 0
            }
          }
        });
      
      default:
        return NextResponse.json(
          { message: 'Invalid action. Allowed: ban, unban, verify, unverify, view' },
          { status: 400 }
        );
    }

    // Apply the update (except for 'view' action)
    if (action !== 'view') {
      await User.findByIdAndUpdate(userId, updateData);
      
      // Log admin action for audit trail
      console.log(`Admin action: ${session.user.name} (${session.user.id}) ${action}ed user ${user.name} (${userId})`);
    }

    return NextResponse.json({ 
      success: true, 
      message: successMessage 
    });

  } catch (error) {
    console.error(`Admin user ${params.action} error:`, error);
    return NextResponse.json(
      { message: 'Failed to perform action' },
      { status: 500 }
    );
  }
}