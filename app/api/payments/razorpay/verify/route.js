// Razorpay Payment Verification API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/utils/rateLimiting';
import { addSecurityHeaders } from '@/utils/validation';
import razorpayService from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

// POST /api/payments/razorpay/verify
export async function POST(request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'payment_verification', 20, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many verification requests' },
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
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      type = 'job_payment'
    } = body;

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: 'Missing payment verification data' },
        { status: 400 }
      );
    }

    // Verify and process payment
    const result = await razorpayService.processSuccessfulPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      type,
      userId: session.user.id
    });

    const response = NextResponse.json({
      success: true,
      message: 'Payment verified and processed successfully',
      payment: result,
      timestamp: new Date().toISOString()
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Payment verification error:', error);
    
    // Different error responses based on error type
    let statusCode = 500;
    let message = 'Payment verification failed';

    if (error.message.includes('signature')) {
      statusCode = 400;
      message = 'Invalid payment signature';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      message = 'Payment order not found';
    } else if (error.message.includes('captured')) {
      statusCode = 400;
      message = 'Payment not captured by gateway';
    }

    const response = NextResponse.json(
      {
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    );
    return addSecurityHeaders(response);
  }
}

// GET /api/payments/razorpay/verify - Get payment status
export async function GET(request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'api_requests', 100, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many requests' },
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

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { success: false, message: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Get payment details
    const paymentDetails = await razorpayService.getPaymentDetails(paymentId);

    const response = NextResponse.json({
      success: true,
      payment: {
        id: paymentDetails.id,
        orderId: paymentDetails.order_id,
        amount: paymentDetails.amount / 100, // Convert from paisa
        currency: paymentDetails.currency,
        status: paymentDetails.status,
        method: paymentDetails.method,
        createdAt: new Date(paymentDetails.created_at * 1000),
        description: paymentDetails.description
      },
      timestamp: new Date().toISOString()
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Get payment status error:', error);
    const response = NextResponse.json(
      {
        success: false,
        message: 'Failed to get payment status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}