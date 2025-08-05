// app/api/subscription/hirer/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'subscription_action', 10, 60 * 1000);
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

    if (user.role !== 'hirer') {
      return NextResponse.json(
        { message: 'Only hirers can subscribe to pro plans' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, planType = 'pro', duration = 'monthly' } = body;

    if (action === 'subscribe') {
      // Check if already pro
      if (user.plan?.type === 'pro' && user.plan?.status === 'active') {
        return NextResponse.json(
          { message: 'You already have an active pro subscription' },
          { status: 400 }
        );
      }

      // Calculate plan details
      const planPrices = {
        monthly: 49,
        quarterly: 129, // 3 months for ₹129 (save ₹18)
        yearly: 490    // 12 months for ₹490 (save ₹98)
      };

      const planDurations = {
        monthly: 30,
        quarterly: 90,
        yearly: 365
      };

      const price = planPrices[duration];
      const days = planDurations[duration];

      if (!price || !days) {
        return NextResponse.json(
          { message: 'Invalid plan duration' },
          { status: 400 }
        );
      }

      // For now, we'll simulate payment success
      // In production, integrate with Razorpay/Stripe
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      // Update user plan
      user.plan = {
        type: 'pro',
        status: 'active',
        subscribedAt: new Date(),
        expiresAt: expiryDate,
        billingCycle: duration,
        amount: price,
        features: [
          'unlimited_job_posting',
          'job_boosting',
          'asap_feature',
          'priority_support',
          'advanced_analytics',
          'no_platform_fees'
        ]
      };

      await user.save();

      // Add notification
      await user.addNotification(
        'subscription_success',
        'Pro Plan Activated!',
        `Your ${duration} pro plan is now active. Enjoy unlimited job posting and boosting features!`
      );

      return NextResponse.json({
        success: true,
        message: 'Pro subscription activated successfully!',
        plan: {
          type: user.plan.type,
          status: user.plan.status,
          expiresAt: user.plan.expiresAt,
          features: user.plan.features
        }
      });

    } else if (action === 'cancel') {
      if (user.plan?.type !== 'pro' || user.plan?.status !== 'active') {
        return NextResponse.json(
          { message: 'No active pro subscription found' },
          { status: 400 }
        );
      }

      // Cancel subscription
      user.plan.status = 'cancelled';
      user.plan.cancelledAt = new Date();

      await user.save();

      // Add notification
      await user.addNotification(
        'subscription_cancelled',
        'Pro Plan Cancelled',
        'Your pro subscription has been cancelled. You can still use pro features until your current period ends.'
      );

      return NextResponse.json({
        success: true,
        message: 'Subscription cancelled successfully',
        plan: {
          type: user.plan.type,
          status: user.plan.status,
          expiresAt: user.plan.expiresAt
        }
      });

    } else if (action === 'boost_job') {
      const { jobId, boostType = 'standard' } = body;

      if (!jobId) {
        return NextResponse.json(
          { message: 'Job ID is required for boosting' },
          { status: 400 }
        );
      }

      // Check if user has pro plan
      if (user.plan?.type !== 'pro' || user.plan?.status !== 'active') {
        return NextResponse.json(
          { message: 'Pro subscription required for job boosting' },
          { status: 403 }
        );
      }

      // Import Job model here to avoid circular dependencies
      const Job = require('../../../../models/Job');
      const job = await Job.findById(jobId);

      if (!job) {
        return NextResponse.json(
          { message: 'Job not found' },
          { status: 404 }
        );
      }

      if (job.createdBy.toString() !== user._id.toString()) {
        return NextResponse.json(
          { message: 'You can only boost your own jobs' },
          { status: 403 }
        );
      }

      // Apply boost
      const boostDuration = boostType === 'premium' ? 7 : 3; // days
      const boostExpiryDate = new Date();
      boostExpiryDate.setDate(boostExpiryDate.getDate() + boostDuration);

      job.boosted = true;
      job.boostType = boostType;
      job.boostedAt = new Date();
      job.boostExpiresAt = boostExpiryDate;

      await job.save();

      return NextResponse.json({
        success: true,
        message: `Job boosted successfully for ${boostDuration} days!`,
        boost: {
          type: boostType,
          expiresAt: boostExpiryDate
        }
      });

    } else {
      return NextResponse.json(
        { message: 'Invalid action. Allowed: subscribe, cancel, boost_job' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Hirer subscription error:', error);
    return NextResponse.json(
      { message: 'Failed to process subscription request' },
      { status: 500 }
    );
  }
}

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
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Get subscription details
    const subscriptionInfo = {
      isPro: user.plan?.type === 'pro' && user.plan?.status === 'active',
      plan: user.plan || { type: 'free', status: 'active' },
      features: {
        unlimited_posting: user.plan?.type === 'pro' && user.plan?.status === 'active',
        job_boosting: user.plan?.type === 'pro' && user.plan?.status === 'active',
        asap_feature: user.plan?.type === 'pro' && user.plan?.status === 'active',
        posting_limit: user.plan?.type === 'pro' && user.plan?.status === 'active' ? 'unlimited' : '1 every 3 hours'
      },
      nextJobPostTime: user.getNextJobPostTime(),
      canPostJob: user.canPostJob()
    };

    return NextResponse.json(subscriptionInfo);

  } catch (error) {
    console.error('Get subscription info error:', error);
    return NextResponse.json(
      { message: 'Failed to get subscription info' },
      { status: 500 }
    );
  }
}