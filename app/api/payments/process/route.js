// app/api/payments/process/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';
import { validateAndSanitize, addSecurityHeaders } from '@/utils/validation';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Initialize payment providers (when env vars are available)
const initializePaymentProviders = () => {
  const providers = {};
  
  if (process.env.STRIPE_SECRET_KEY) {
    providers.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
  }
  
  if (process.env.RAZORPAY_KEY_SECRET) {
    try {
      const Razorpay = require('razorpay');
      providers.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
    } catch (error) {
      console.warn('Razorpay module not installed');
    }
  }
  
  return providers;
};

const paymentProviders = initializePaymentProviders();

// POST /api/payments/process - Process payment for job
export async function POST(request) {
  try {
    // Apply strict rate limiting for payments
    const rateLimitResult = await rateLimit(request, 'payment_process', 5, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Too many payment attempts. Please try again later.',
          code: 'RATE_LIMITED'
        },
        { status: 429 }
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Authentication required',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse and validate request body
    const body = await request.json();
    const {
      jobId,
      amount,
      currency = 'INR',
      provider = 'stripe', // 'stripe' or 'razorpay'
      paymentMethodId,
      paymentIntentId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      metadata = {}
    } = body;

    // Validate required fields
    if (!jobId || !amount) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Job ID and amount are required',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount <= 0 || amount > 1000000) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid payment amount',
          code: 'INVALID_AMOUNT'
        },
        { status: 400 }
      );
    }

    // Get job and validate
    const job = await Job.findById(jobId).populate('createdBy assignedTo');
    if (!job) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Job not found',
          code: 'JOB_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Check if user is authorized to pay for this job
    if (job.createdBy._id.toString() !== session.user.id) {
      return NextResponse.json(
        { 
          success: false,
          message: 'You are not authorized to pay for this job',
          code: 'UNAUTHORIZED_PAYMENT'
        },
        { status: 403 }
      );
    }

    // Check job status
    if (job.status !== 'completed') {
      return NextResponse.json(
        { 
          success: false,
          message: 'Payment can only be made for completed jobs',
          code: 'INVALID_JOB_STATUS'
        },
        { status: 400 }
      );
    }

    // Check if already paid
    if (job.payment?.status === 'paid') {
      return NextResponse.json(
        { 
          success: false,
          message: 'Payment has already been processed for this job',
          code: 'ALREADY_PAID'
        },
        { status: 400 }
      );
    }

    let paymentResult = null;

    try {
      // Process payment based on provider
      if (provider === 'stripe' && paymentProviders.stripe) {
        paymentResult = await processStripePayment({
          amount,
          currency,
          paymentMethodId,
          paymentIntentId,
          job,
          user: session.user,
          metadata
        });
      } else if (provider === 'razorpay' && paymentProviders.razorpay) {
        paymentResult = await processRazorpayPayment({
          amount,
          currency,
          razorpayPaymentId,
          razorpayOrderId,
          razorpaySignature,
          job,
          user: session.user,
          metadata
        });
      } else {
        return NextResponse.json(
          { 
            success: false,
            message: `Payment provider ${provider} is not configured or available`,
            code: 'PROVIDER_UNAVAILABLE'
          },
          { status: 400 }
        );
      }

      // Update job with payment information
      if (paymentResult.success) {
        job.payment = {
          status: 'paid',
          provider,
          transactionId: paymentResult.transactionId,
          amount: paymentResult.amount,
          currency: paymentResult.currency,
          paidAt: new Date(),
          paymentMethod: paymentResult.paymentMethod,
          feeAmount: paymentResult.feeAmount || 0,
          netAmount: paymentResult.netAmount || paymentResult.amount,
          metadata: paymentResult.metadata || {}
        };

        // Update job status to completed and confirmed
        job.completion.confirmedAt = new Date();
        job.completion.confirmedBy = session.user.id;

        await job.save();

        // Update user earnings if they are the fixer
        if (job.assignedTo) {
          const fixer = await User.findById(job.assignedTo._id);
          if (fixer) {
            fixer.earnings.total += paymentResult.netAmount;
            fixer.earnings.pending = Math.max(0, fixer.earnings.pending - paymentResult.netAmount);
            fixer.earnings.lastPayment = new Date();
            fixer.jobsCompleted += 1;
            
            // Add notification to fixer
            fixer.addNotification(
              'payment_received',
              'Payment Received',
              `You received ₹${paymentResult.netAmount} for completing "${job.title}"`
            );
            
            await fixer.save();
          }
        }

        // Add notification to job creator
        const creator = await User.findById(job.createdBy._id);
        if (creator) {
          creator.addNotification(
            'payment_completed',
            'Payment Successful',
            `Payment of ₹${paymentResult.amount} has been processed for "${job.title}"`
          );
          await creator.save();
        }

        const response = NextResponse.json({
          success: true,
          message: 'Payment processed successfully',
          payment: {
            transactionId: paymentResult.transactionId,
            amount: paymentResult.amount,
            currency: paymentResult.currency,
            provider,
            status: 'paid'
          },
          job: {
            id: job._id,
            title: job.title,
            status: job.status
          }
        });

        return addSecurityHeaders(response);
      } else {
        return NextResponse.json(
          { 
            success: false,
            message: paymentResult.error || 'Payment processing failed',
            code: 'PAYMENT_FAILED'
          },
          { status: 400 }
        );
      }

    } catch (paymentError) {
      console.error('Payment processing error:', paymentError);
      
      // Log failed payment attempt
      job.payment = {
        status: 'failed',
        provider,
        failedAt: new Date(),
        errorMessage: paymentError.message,
        metadata: { 
          error: paymentError.message,
          code: paymentError.code || 'UNKNOWN_ERROR'
        }
      };
      await job.save();

      return NextResponse.json(
        { 
          success: false,
          message: 'Payment processing failed. Please try again.',
          code: 'PAYMENT_ERROR'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Payment API error:', error);
    const response = NextResponse.json(
      { 
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Process Stripe payment
async function processStripePayment({
  amount,
  currency,
  paymentMethodId,
  paymentIntentId,
  job,
  user,
  metadata
}) {
  try {
    const stripe = paymentProviders.stripe;
    
    if (paymentIntentId) {
      // Confirm existing payment intent
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId
      });
      
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          transactionId: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency,
          paymentMethod: paymentIntent.payment_method,
          feeAmount: calculateStripeFee(paymentIntent.amount / 100),
          netAmount: (paymentIntent.amount / 100) - calculateStripeFee(paymentIntent.amount / 100),
          metadata: paymentIntent.metadata
        };
      } else {
        throw new Error(`Payment failed with status: ${paymentIntent.status}`);
      }
    } else {
      // Create new payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          jobId: job._id.toString(),
          userId: user.id,
          ...metadata
        },
        description: `Payment for job: ${job.title}`,
        receipt_email: user.email
      });
      
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          transactionId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          paymentMethod: paymentIntent.payment_method,
          feeAmount: calculateStripeFee(paymentIntent.amount / 100),
          netAmount: (paymentIntent.amount / 100) - calculateStripeFee(paymentIntent.amount / 100),
          metadata: paymentIntent.metadata
        };
      } else {
        throw new Error(`Payment failed with status: ${paymentIntent.status}`);
      }
    }
  } catch (error) {
    console.error('Stripe payment error:', error);
    return {
      success: false,
      error: error.message || 'Stripe payment failed'
    };
  }
}

// Process Razorpay payment
async function processRazorpayPayment({
  amount,
  currency,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature,
  job,
  user,
  metadata
}) {
  try {
    const razorpay = paymentProviders.razorpay;
    
    // Verify payment signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');
    
    if (expectedSignature !== razorpaySignature) {
      throw new Error('Invalid payment signature');
    }
    
    // Fetch payment details
    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    
    if (payment.status === 'captured') {
      return {
        success: true,
        transactionId: razorpayPaymentId,
        amount: payment.amount / 100, // Convert from paise
        currency: payment.currency,
        paymentMethod: payment.method,
        feeAmount: calculateRazorpayFee(payment.amount / 100),
        netAmount: (payment.amount / 100) - calculateRazorpayFee(payment.amount / 100),
        metadata: {
          orderId: razorpayOrderId,
          ...metadata
        }
      };
    } else {
      throw new Error(`Payment not captured. Status: ${payment.status}`);
    }
  } catch (error) {
    console.error('Razorpay payment error:', error);
    return {
      success: false,
      error: error.message || 'Razorpay payment failed'
    };
  }
}

// Calculate Stripe fee (approximate)
function calculateStripeFee(amount) {
  // Stripe India: 2.9% + ₹2 per transaction
  return Math.round((amount * 0.029 + 2) * 100) / 100;
}

// Calculate Razorpay fee (approximate)
function calculateRazorpayFee(amount) {
  // Razorpay: 2% per transaction
  return Math.round(amount * 0.02 * 100) / 100;
}

// GET /api/payments/process - Get payment methods and configuration
export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'api_requests', 100, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Return available payment methods
    const availableMethods = [];
    
    if (paymentProviders.stripe) {
      availableMethods.push({
        provider: 'stripe',
        name: 'Stripe',
        supportedCurrencies: ['INR', 'USD'],
        paymentMethods: ['card', 'upi', 'netbanking'],
        fees: {
          percentage: 2.9,
          fixed: 2,
          currency: 'INR'
        }
      });
    }
    
    if (paymentProviders.razorpay) {
      availableMethods.push({
        provider: 'razorpay',
        name: 'Razorpay',
        supportedCurrencies: ['INR'],
        paymentMethods: ['card', 'upi', 'netbanking', 'wallet'],
        fees: {
          percentage: 2.0,
          fixed: 0,
          currency: 'INR'
        }
      });
    }

    const response = NextResponse.json({
      success: true,
      availableProviders: availableMethods,
      defaultProvider: availableMethods[0]?.provider || null,
      supportedCurrencies: ['INR', 'USD']
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Get payment methods error:', error);
    const response = NextResponse.json(
      { message: 'Failed to get payment methods' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}