import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

// Mock Razorpay for development
const mockRazorpay = {
  orders: {
    create: async (options) => {
      return {
        id: 'order_mock_' + Date.now(),
        entity: 'order',
        amount: options.amount,
        amount_paid: 0,
        amount_due: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        status: 'created',
        attempts: 0,
        created_at: Math.floor(Date.now() / 1000)
      };
    }
  }
};

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'create_order', 5, 60); // 5 orders per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many order creation attempts. Please try again later.' },
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
    if (!user || user.role !== 'fixer') {
      return NextResponse.json(
        { message: 'Only fixers can subscribe to Pro' },
        { status: 403 }
      );
    }

    if (user.banned) {
      return NextResponse.json(
        { message: 'Account suspended' },
        { status: 403 }
      );
    }

    // Check if user already has active subscription
    if (user.plan?.type === 'pro' && user.plan?.status === 'active') {
      return NextResponse.json(
        { message: 'You already have an active Pro subscription' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { plan } = body;

    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json(
        { message: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Plan pricing
    const planPricing = {
      monthly: {
        amount: 9900, // ₹99 in paise
        duration: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        name: 'Fixly Pro Monthly'
      },
      yearly: {
        amount: 99900, // ₹999 in paise
        duration: 365 * 24 * 60 * 60 * 1000, // 365 days in milliseconds
        name: 'Fixly Pro Yearly'
      }
    };

    const selectedPlan = planPricing[plan];
    const receipt = `fixly_${plan}_${user._id}_${Date.now()}`;

    try {
      let razorpayOrder;

      // Use mock Razorpay in development or if no real keys provided
      if (process.env.NODE_ENV === 'development' || !process.env.RAZORPAY_KEY_SECRET) {
        razorpayOrder = await mockRazorpay.orders.create({
          amount: selectedPlan.amount,
          currency: 'INR',
          receipt: receipt,
          payment_capture: 1
        });
      } else {
        // Real Razorpay integration
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        razorpayOrder = await razorpay.orders.create({
          amount: selectedPlan.amount,
          currency: 'INR',
          receipt: receipt,
          payment_capture: 1
        });
      }

      // Store order details in user for verification later
      user.pendingOrder = {
        orderId: razorpayOrder.id,
        amount: selectedPlan.amount,
        plan: plan,
        createdAt: new Date()
      };
      await user.save();

      return NextResponse.json({
        success: true,
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt
        },
        plan: {
          type: plan,
          name: selectedPlan.name,
          amount: selectedPlan.amount,
          duration: selectedPlan.duration
        },
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone
        }
      });

    } catch (razorpayError) {
      console.error('Razorpay order creation error:', razorpayError);
      return NextResponse.json(
        { message: 'Failed to create payment order. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}