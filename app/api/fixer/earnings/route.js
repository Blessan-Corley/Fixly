// app/api/fixer/earnings/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import Job from '../../../../models/Job';
import User from '../../../../models/User';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'fixer') {
      return NextResponse.json(
        { message: 'Only fixers can access earnings data' },
        { status: 403 }
      );
    }

    // Get all jobs where this fixer has applied or is assigned
    const jobs = await Job.find({
      $or: [
        { 'applications.fixer': user._id },
        { assignedTo: user._id }
      ]
    })
    .populate('createdBy', 'name email')
    .populate('applications.fixer', 'name username photoURL')
    .sort({ createdAt: -1 });

    // Filter to get only jobs where this fixer is involved
    const fixerJobs = jobs.map(job => {
      // Find this fixer's application
      const application = job.applications.find(app => 
        app.fixer._id.toString() === user._id.toString()
      );

      if (!application && job.assignedTo?.toString() !== user._id.toString()) {
        return null;
      }

      // Return job with fixer-specific data
      return {
        _id: job._id,
        title: job.title,
        description: job.description,
        skillsRequired: job.skillsRequired,
        location: job.location,
        budget: job.budget,
        urgency: job.urgency,
        deadline: job.deadline,
        status: job.status,
        createdAt: job.createdAt,
        createdBy: {
          name: job.createdBy.name,
          email: job.status === 'completed' ? job.createdBy.email : null // Only show email after completion
        },
        application: application ? {
          _id: application._id,
          proposedAmount: application.proposedAmount,
          status: application.status,
          appliedAt: application.appliedAt
        } : null,
        assignedTo: job.assignedTo,
        progress: job.progress,
        completion: job.completion,
        earnings: application?.status === 'accepted' && job.status === 'completed' 
          ? (application.proposedAmount || job.budget.amount) 
          : null,
        payment: job.payment
      };
    }).filter(Boolean);

    // Calculate earnings summary
    const completedJobs = fixerJobs.filter(job => job.status === 'completed');
    const totalEarnings = completedJobs.reduce((sum, job) => sum + (job.earnings || 0), 0);
    
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const thisMonthEarnings = completedJobs
      .filter(job => job.progress?.completedAt && new Date(job.progress.completedAt) >= thisMonth)
      .reduce((sum, job) => sum + (job.earnings || 0), 0);
      
    const lastMonthEarnings = completedJobs
      .filter(job => {
        if (!job.progress?.completedAt) return false;
        const completedDate = new Date(job.progress.completedAt);
        return completedDate >= lastMonth && completedDate < thisMonth;
      })
      .reduce((sum, job) => sum + (job.earnings || 0), 0);

    const pendingJobs = fixerJobs.filter(job => 
      ['accepted', 'in_progress'].includes(job.status)
    );
    
    const summary = {
      totalEarnings,
      thisMonth: thisMonthEarnings,
      lastMonth: lastMonthEarnings,
      completedJobs: completedJobs.length,
      pendingJobs: pendingJobs.length,
      averageEarning: completedJobs.length > 0 ? Math.round(totalEarnings / completedJobs.length) : 0,
      monthlyGrowth: lastMonthEarnings > 0 ? Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100) : 0
    };

    return NextResponse.json({
      success: true,
      jobs: fixerJobs,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fixer earnings API error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch earnings data' },
      { status: 500 }
    );
  }
}