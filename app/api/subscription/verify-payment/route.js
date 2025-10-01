// app/api/subscription/verify-payment/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'verify_payment', 10, 60 * 60 * 1000); // 10 verifications per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many verification attempts. Please try again later.' },
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
        { message: 'Only fixers can verify subscription payments' },
        { status: 403 }
      );
    }

    if (user.banned) {
      return NextResponse.json(
        { message: 'Account suspended' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      planType
    } = body;

    // Validation
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { message: 'Missing payment verification data' },
        { status: 400 }
      );
    }

    if (!planType || !['monthly', 'yearly'].includes(planType)) {
      return NextResponse.json(
        { message: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Check if user has pending order
    if (!user.pendingOrder || user.pendingOrder.orderId !== razorpayOrderId) {
      return NextResponse.json(
        { message: 'No pending order found for this payment' },
        { status: 400 }
      );
    }

    // ALWAYS verify payment signature - use test keys in development
    const RAZORPAY_SECRET = process.env.NODE_ENV === 'production'
      ? process.env.RAZORPAY_KEY_SECRET
      : process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!RAZORPAY_SECRET) {
      console.error('CRITICAL: Razorpay secret key not configured');
      return NextResponse.json(
        { message: 'Payment verification service unavailable. Please contact support.' },
        { status: 503 }
      );
    }

    // Verify Razorpay payment signature
    const signatureBody = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_SECRET)
      .update(signatureBody.toString())
      .digest('hex');

    const isValidSignature = expectedSignature === razorpaySignature;

    // Log all verification attempts for security audit
    console.log('Payment verification attempt:', {
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      userId: user._id,
      verified: isValidSignature,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    if (!isValidSignature) {
      // Log failed verification for security monitoring
      console.error('Payment signature verification FAILED:', {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        userId: user._id,
        userEmail: user.email
      });

      return NextResponse.json(
        { message: 'Invalid payment signature. Payment verification failed.' },
        { status: 400 }
      );
    }

    // Calculate plan duration
    const now = new Date();
    let endDate;
    
    if (planType === 'monthly') {
      endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    } else if (planType === 'yearly') {
      endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days
    }

    // Update user's subscription
    user.plan = {
      type: 'pro',
      startDate: now,
      endDate: endDate,
      status: 'active',
      paymentId: razorpayPaymentId,
      creditsUsed: 0 // Reset credits for new pro user
    };

    // Clear pending order
    user.pendingOrder = undefined;

    await user.save();

    // Add notification
    await user.addNotification(
      'subscription_activated',
      'Pro Subscription Activated! 🎉',
      `Your ${planType} Pro subscription is now active. Enjoy unlimited job applications and priority support!`,
      {
        planType,
        paymentId: razorpayPaymentId,
        validUntil: endDate
      }
    );

    // Send confirmation email
    try {
      await sendSubscriptionConfirmationEmail(user, planType, endDate);
    } catch (emailError) {
      console.error('Subscription confirmation email error:', emailError);
      // Don't fail the payment verification if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      subscription: {
        type: 'pro',
        plan: planType,
        startDate: now,
        endDate: endDate,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { message: 'Payment verification failed. Please contact support.' },
      { status: 500 }
    );
  }
}

async function sendSubscriptionConfirmationEmail(user, planType, endDate) {
  const planName = planType === 'monthly' ? 'Monthly Pro' : 'Yearly Pro';
  const amount = planType === 'monthly' ? '₹99' : '₹999';

  const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #374650; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #DCF763; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #ffffff; padding: 30px; border: 1px solid #e1e3e0; }
        .footer { background-color: #F1F2EE; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #DCF763; color: #374650; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .subscription-box { background-color: #e8f5e8; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .features { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; color: #374650;">Welcome to Pro! 🎉</h1>
        </div>
        <div class="content">
          <h2>Hi ${user.name}!</h2>
          <p>Congratulations! Your Fixly Pro subscription has been activated successfully.</p>
          
          <div class="subscription-box">
            <h3>🌟 Subscription Details:</h3>
            <p><strong>Plan:</strong> ${planName}</p>
            <p><strong>Amount Paid:</strong> ${amount}</p>
            <p><strong>Valid Until:</strong> ${endDate.toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}</p>
            <p><strong>Status:</strong> Active</p>
          </div>

          <div class="features">
            <h3>🚀 Your Pro Benefits:</h3>
            <ul>
              <li><strong>Unlimited Job Applications</strong> - Apply to as many jobs as you want</li>
              <li><strong>Priority Listing</strong> - Your applications appear higher in search results</li>
              <li><strong>Advanced Analytics</strong> - Track your application success rate and earnings</li>
              <li><strong>Priority Support</strong> - Get faster responses from our support team</li>
              <li><strong>Exclusive Job Alerts</strong> - Get notified about high-value jobs first</li>
              <li><strong>Profile Boost</strong> - Enhanced visibility to hirers</li>
            </ul>
          </div>
          
          <p>Start applying to unlimited jobs and grow your business with Fixly Pro!</p>
          
          <a href="${process.env.NEXTAUTH_URL}/dashboard/browse-jobs" class="button">Browse Jobs Now</a>
          
          <p>If you have any questions about your subscription, our support team is here to help.</p>
          
          <p>Thank you for choosing Fixly Pro!</p>
          
          <p>Best regards,<br>The Fixly Team</p>
        </div>
        <div class="footer">
          <p style="margin: 0; font-size: 14px; color: #5a6c75;">
            This email was sent to ${user.email}. 
            <a href="${process.env.NEXTAUTH_URL}/dashboard/subscription" style="color: #374650;">Manage subscription</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Fixly" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Welcome to Fixly Pro! Your subscription is active 🎉',
    html: emailTemplate,
  });
}