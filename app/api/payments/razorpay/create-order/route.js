// Razorpay Order Creation API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/utils/rateLimiting';
import { addSecurityHeaders } from '@/utils/validation';
import razorpayService from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

// POST /api/payments/razorpay/create-order
export async function POST(request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'payment_orders', 10, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many payment requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if Razorpay is configured
    if (!razorpayService.isConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Payment service is not available' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { type, ...orderData } = body;

    let order;

    switch (type) {
      case 'job_payment':
        order = await createJobPaymentOrder(session.user.id, orderData);
        break;
      
      case 'subscription':
        order = await createSubscriptionOrder(session.user.id, orderData);
        break;
      
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid payment type' },
          { status: 400 }
        );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Payment order created successfully',
      order,
      timestamp: new Date().toISOString()
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Create payment order error:', error);
    const response = NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to create payment order',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Create job payment order
async function createJobPaymentOrder(userId, orderData) {
  const {
    jobId,
    payeeId,
    amount,
    description = 'Job payment',
    metadata = {}
  } = orderData;

  // Validation
  if (!jobId || !payeeId || !amount) {
    throw new Error('Job ID, payee ID, and amount are required');
  }

  if (amount < 1) {
    throw new Error('Minimum payment amount is ₹1');
  }

  if (amount > 100000) {
    throw new Error('Maximum payment amount is ₹1,00,000');
  }

  // Create payment order
  return await razorpayService.createJobPaymentOrder({
    jobId,
    payerId: userId,
    payeeId,
    amount: parseFloat(amount),
    description,
    metadata
  });
}

// Create subscription order
async function createSubscriptionOrder(userId, orderData) {
  const {
    planType,
    planName,
    amount,
    duration = 'monthly',
    description = 'Subscription payment'
  } = orderData;

  // Validation
  if (!planType || !planName || !amount) {
    throw new Error('Plan type, name, and amount are required');
  }

  if (amount < 99) {
    throw new Error('Minimum subscription amount is ₹99');
  }

  const validPlans = ['basic', 'premium', 'business'];
  if (!validPlans.includes(planType)) {
    throw new Error('Invalid plan type');
  }

  const validDurations = ['monthly', 'yearly'];
  if (!validDurations.includes(duration)) {
    throw new Error('Invalid duration');
  }

  // Create subscription order
  return await razorpayService.createSubscriptionOrder({
    userId,
    planType,
    planName,
    amount: parseFloat(amount),
    duration,
    description
  });
}