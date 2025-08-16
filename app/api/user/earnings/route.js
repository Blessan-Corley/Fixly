// app/api/user/earnings/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import Job from '../../../../models/Job';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'earnings', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    let earnings = {
      total: 0,
      thisMonth: 0,
      completedJobs: 0
    };

    try {
      if (user.role === 'hirer') {
        // For hirers, show job spending
        const completedJobs = await Job.find({
          createdBy: user._id,
          status: 'completed',
          'completion.confirmedAt': { $exists: true }
        }).select('budget.amount createdAt completion.confirmedAt').lean();

        earnings.completedJobs = completedJobs.length;
        earnings.total = completedJobs.reduce((sum, job) => sum + (job.budget?.amount || 0), 0);

        // Calculate this month's spending
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthJobs = completedJobs.filter(job => 
          job.completion?.confirmedAt && new Date(job.completion.confirmedAt) >= thisMonth
        );
        earnings.thisMonth = thisMonthJobs.reduce((sum, job) => sum + (job.budget?.amount || 0), 0);

      } else if (user.role === 'fixer') {
        // For fixers, show earnings
        const completedJobs = await Job.find({
          assignedTo: user._id,
          status: 'completed',
          'completion.confirmedAt': { $exists: true }
        }).select('budget.amount createdAt completion.confirmedAt').lean();

        earnings.completedJobs = completedJobs.length;
        earnings.total = completedJobs.reduce((sum, job) => sum + (job.budget?.amount || 0), 0);

        // Calculate this month's earnings
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthJobs = completedJobs.filter(job => 
          job.completion?.confirmedAt && new Date(job.completion.confirmedAt) >= thisMonth
        );
        earnings.thisMonth = thisMonthJobs.reduce((sum, job) => sum + (job.budget?.amount || 0), 0);
      }
    } catch (earningsError) {
      console.error('Error calculating earnings:', earningsError);
      // Return default earnings object if calculation fails
      earnings = {
        total: 0,
        thisMonth: 0,
        completedJobs: 0,
        error: 'Unable to calculate earnings at this time'
      };
    }

    return NextResponse.json({
      earnings
    });

  } catch (error) {
    console.error('Earnings fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}