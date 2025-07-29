import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import Job from '../../../../models/Job';

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

    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      activeJobs,
      completedJobsThisMonth,
      disputes,
      totalRevenue
    ] = await Promise.all([
      // Total users (excluding admins)
      User.countDocuments({ role: { $ne: 'admin' } }),
      
      // New users this month
      User.countDocuments({ 
        role: { $ne: 'admin' },
        createdAt: { $gte: monthStart }
      }),
      
      // Active jobs
      Job.countDocuments({ 
        status: { $in: ['open', 'in_progress'] }
      }),
      
      // Completed jobs this month
      Job.countDocuments({
        status: 'completed',
        completedAt: { $gte: monthStart }
      }),
      
      // Open disputes
      Job.countDocuments({
        'dispute.status': 'open'
      }),
      
      // Revenue calculation (platform fee from completed jobs)
      Job.aggregate([
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: monthStart }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$budget.amount' }
          }
        }
      ])
    ]);

    const monthlyRevenue = totalRevenue[0]?.total || 0;
    const platformFee = Math.round(monthlyRevenue * 0.05); // 5% platform fee

    return NextResponse.json({
      totalUsers,
      newUsersThisMonth,
      activeJobs,
      completedJobsThisMonth,
      disputes,
      monthlyRevenue: platformFee,
      systemHealth: 'operational'
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}