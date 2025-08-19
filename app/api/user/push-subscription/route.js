// app/api/user/push-subscription/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'push_subscription', 10, 60 * 1000);
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

    const body = await request.json();
    const { subscription } = body;

    if (!subscription) {
      return NextResponse.json(
        { message: 'Subscription data required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Save push subscription to user
    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        pushSubscription: {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          expirationTime: subscription.expirationTime,
          userAgent: request.headers.get('user-agent'),
          subscribedAt: new Date()
        }
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription saved successfully'
    });

  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json(
      { message: 'Failed to save push subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Remove push subscription from user
    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        $unset: { pushSubscription: 1 }
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription removed successfully'
    });

  } catch (error) {
    console.error('Remove push subscription error:', error);
    return NextResponse.json(
      { message: 'Failed to remove push subscription' },
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

    const user = await User.findById(session.user.id).select('pushSubscription');
    
    return NextResponse.json({
      success: true,
      subscribed: !!user?.pushSubscription,
      subscription: user?.pushSubscription || null
    });

  } catch (error) {
    console.error('Get push subscription error:', error);
    return NextResponse.json(
      { message: 'Failed to get push subscription' },
      { status: 500 }
    );
  }
}