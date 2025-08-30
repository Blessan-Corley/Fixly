// Razorpay Webhook Handler for Real-time Payment Updates
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import razorpayService from '@/lib/razorpay';
import { addSecurityHeaders } from '@/utils/validation';
import realtimeManager from '@/lib/realtime/RealtimeManager';
import notificationService from '@/lib/realtime/NotificationService';

export const dynamic = 'force-dynamic';

// POST /api/payments/razorpay/webhook - Handle Razorpay webhooks
export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.warn('⚠️  Invalid Razorpay webhook signature');
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    console.log(`📧 Razorpay webhook received: ${event.event}`);

    // Process webhook based on event type
    await processWebhookEvent(event);

    const response = NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      event: event.event
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Razorpay webhook error:', error);
    const response = NextResponse.json(
      { success: false, message: 'Webhook processing failed' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Verify webhook signature
function verifyWebhookSignature(body, signature) {
  if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );
}

// Process different webhook events
async function processWebhookEvent(event) {
  const { event: eventType, payload } = event;

  switch (eventType) {
    case 'payment.captured':
      await handlePaymentCaptured(payload.payment.entity);
      break;

    case 'payment.failed':
      await handlePaymentFailed(payload.payment.entity);
      break;

    case 'order.paid':
      await handleOrderPaid(payload.order.entity);
      break;

    case 'payment.dispute.created':
      await handlePaymentDispute(payload.payment.entity);
      break;

    case 'refund.created':
      await handleRefundCreated(payload.refund.entity);
      break;

    case 'subscription.activated':
      await handleSubscriptionActivated(payload.subscription.entity);
      break;

    case 'subscription.cancelled':
      await handleSubscriptionCancelled(payload.subscription.entity);
      break;

    default:
      console.log(`📋 Unhandled webhook event: ${eventType}`);
  }
}

// Handle successful payment capture
async function handlePaymentCaptured(payment) {
  console.log(`✅ Payment captured: ${payment.id}`);

  try {
    // Extract order information
    const orderId = payment.order_id;
    const paymentId = payment.id;
    const amount = payment.amount / 100; // Convert from paisa

    // Get order notes for context
    const notes = payment.notes || {};
    const jobId = notes.jobId;
    const payerId = notes.payerId;
    const payeeId = notes.payeeId;

    // Send real-time updates
    if (payerId) {
      realtimeManager.sendToUser(payerId, {
        type: 'payment_captured',
        data: {
          paymentId,
          orderId,
          amount,
          status: 'captured',
          timestamp: new Date()
        }
      });

      // Send notification
      await notificationService.sendNotification(payerId, {
        type: 'payment_success',
        title: 'Payment Successful',
        message: `Your payment of ₹${amount} has been processed successfully.`,
        data: { paymentId, amount, jobId }
      });
    }

    if (payeeId) {
      realtimeManager.sendToUser(payeeId, {
        type: 'payment_received',
        data: {
          paymentId,
          orderId,
          amount,
          status: 'received',
          timestamp: new Date()
        }
      });

      // Send notification
      await notificationService.sendNotification(payeeId, {
        type: 'payment_received',
        title: 'Payment Received',
        message: `You received a payment of ₹${amount}.`,
        data: { paymentId, amount, jobId, payerName: notes.payerName }
      });
    }

  } catch (error) {
    console.error('Payment captured handling error:', error);
  }
}

// Handle failed payment
async function handlePaymentFailed(payment) {
  console.log(`❌ Payment failed: ${payment.id}`);

  try {
    const notes = payment.notes || {};
    const payerId = notes.payerId;
    const amount = payment.amount / 100;

    if (payerId) {
      // Send real-time update
      realtimeManager.sendToUser(payerId, {
        type: 'payment_failed',
        data: {
          paymentId: payment.id,
          orderId: payment.order_id,
          amount,
          status: 'failed',
          errorCode: payment.error_code,
          errorDescription: payment.error_description,
          timestamp: new Date()
        }
      });

      // Send notification
      await notificationService.sendNotification(payerId, {
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment of ₹${amount} could not be processed. Please try again.`,
        data: {
          paymentId: payment.id,
          amount,
          errorReason: payment.error_description
        }
      });
    }

  } catch (error) {
    console.error('Payment failed handling error:', error);
  }
}

// Handle order paid
async function handleOrderPaid(order) {
  console.log(`🎉 Order paid: ${order.id}`);

  try {
    const amount = order.amount / 100;
    const notes = order.notes || {};

    // Broadcast order completion
    realtimeManager.broadcast({
      type: 'order_completed',
      data: {
        orderId: order.id,
        amount,
        status: 'paid',
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Order paid handling error:', error);
  }
}

// Handle payment dispute
async function handlePaymentDispute(payment) {
  console.log(`⚠️  Payment dispute created: ${payment.id}`);

  try {
    const notes = payment.notes || {};
    const payeeId = notes.payeeId;
    const payerId = notes.payerId;
    const amount = payment.amount / 100;

    // Notify both parties
    if (payeeId) {
      await notificationService.sendNotification(payeeId, {
        type: 'payment_dispute',
        title: 'Payment Dispute',
        message: `A dispute has been raised for payment of ₹${amount}.`,
        data: { paymentId: payment.id, amount, status: 'disputed' }
      });
    }

    if (payerId) {
      await notificationService.sendNotification(payerId, {
        type: 'payment_dispute',
        title: 'Payment Dispute Created',
        message: `Your dispute for payment of ₹${amount} has been registered.`,
        data: { paymentId: payment.id, amount, status: 'disputed' }
      });
    }

  } catch (error) {
    console.error('Payment dispute handling error:', error);
  }
}

// Handle refund created
async function handleRefundCreated(refund) {
  console.log(`💰 Refund created: ${refund.id}`);

  try {
    const amount = refund.amount / 100;
    const paymentId = refund.payment_id;

    // Get payment details to find user
    const payment = await razorpayService.getPaymentDetails(paymentId);
    const notes = payment.notes || {};
    const payerId = notes.payerId;

    if (payerId) {
      // Send real-time update
      realtimeManager.sendToUser(payerId, {
        type: 'refund_processed',
        data: {
          refundId: refund.id,
          paymentId,
          amount,
          status: refund.status,
          timestamp: new Date()
        }
      });

      // Send notification
      await notificationService.sendNotification(payerId, {
        type: 'refund_processed',
        title: 'Refund Processed',
        message: `Your refund of ₹${amount} has been processed successfully.`,
        data: { refundId: refund.id, amount, paymentId }
      });
    }

  } catch (error) {
    console.error('Refund handling error:', error);
  }
}

// Handle subscription activated
async function handleSubscriptionActivated(subscription) {
  console.log(`📱 Subscription activated: ${subscription.id}`);

  try {
    // Implementation for subscription activation
    // This would update user's subscription status in database
  } catch (error) {
    console.error('Subscription activation handling error:', error);
  }
}

// Handle subscription cancelled
async function handleSubscriptionCancelled(subscription) {
  console.log(`❌ Subscription cancelled: ${subscription.id}`);

  try {
    // Implementation for subscription cancellation
    // This would update user's subscription status in database
  } catch (error) {
    console.error('Subscription cancellation handling error:', error);
  }
}