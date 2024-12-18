// app/api/subscription/fixer/route.js
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
    const rateLimitResult = await rateLimit(request, 'fixer_subscription', 10, 60 * 1000);
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

    if (user.role !== 'fixer') {
      return NextResponse.json(
        { message: 'Only fixers can subscribe to pro plans' },
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

      // Calculate plan details for fixers
      const planPrices = {
        monthly: 99,
        quarterly: 249, // 3 months for ₹249 (save ₹48)
        yearly: 999     // 12 months for ₹999 (save ₹189)
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
        creditsUsed: 0, // Reset credits for pro users
        features: [
          'unlimited_applications',
          'priority_listing',
          'advanced_analytics',
          'profile_boost',
          'priority_support',
          'exclusive_job_alerts',
          'enhanced_visibility'
        ]
      };

      await user.save();

      // Add notification
      await user.addNotification(
        'subscription_success',
        'Pro Plan Activated! 🚀',
        `Your ${duration} pro plan is now active. Enjoy unlimited job applications and enhanced visibility!`
      );

      return NextResponse.json({
        success: true,
        message: 'Pro subscription activated successfully!',
        plan: {
          type: user.plan.type,
          status: user.plan.status,
          expiresAt: user.plan.expiresAt,
          creditsUsed: user.plan.creditsUsed,
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

    } else {
      return NextResponse.json(
        { message: 'Invalid action. Allowed: subscribe, cancel' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Fixer subscription error:', error);
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

    const isPro = user.plan?.type === 'pro' && user.plan?.status === 'active';
    const creditsUsed = user.plan?.creditsUsed || 0;
    const creditsRemaining = isPro ? 'unlimited' : Math.max(0, 3 - creditsUsed);

    // Get subscription details
    const subscriptionInfo = {
      isPro,
      plan: user.plan || { type: 'free', status: 'active', creditsUsed: 0 },
      features: {
        unlimited_applications: isPro,
        priority_listing: isPro,
        advanced_analytics: isPro,
        profile_boost: isPro,
        priority_support: isPro,
        exclusive_job_alerts: isPro,
        enhanced_visibility: isPro,
        application_limit: isPro ? 'unlimited' : '3 per month'
      },
      creditsRemaining,
      canApplyToJobs: isPro || creditsRemaining > 0,
      upgradeRequired: !isPro && creditsRemaining <= 0
    };

    return NextResponse.json(subscriptionInfo);

  } catch (error) {
    console.error('Get fixer subscription info error:', error);
    return NextResponse.json(
      { message: 'Failed to get subscription info' },
      { status: 500 }
    );
  }
}