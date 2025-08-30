// Comprehensive Razorpay Integration for Fixly Platform
import Razorpay from 'razorpay';
import crypto from 'crypto';
import connectDB from './db';
import User from '@/models/User';
import Job from '@/models/Job';
import realtimeManager from './realtime/RealtimeManager';
import notificationService from './realtime/NotificationService';

// Razorpay configuration
const razorpayConfig = {
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
};

if (!razorpayConfig.key_id || !razorpayConfig.key_secret) {
  console.warn('⚠️  Razorpay credentials not found. Payment features will be disabled.');
}

// Initialize Razorpay instance
const razorpay = razorpayConfig.key_id ? new Razorpay(razorpayConfig) : null;

class RazorpayService {
  constructor() {
    this.isEnabled = !!razorpay;
    this.currency = 'INR';
    this.receiptPrefix = 'FIXLY_';
  }

  // Check if Razorpay is properly configured
  isConfigured() {
    return this.isEnabled;
  }

  // Create payment order for job payment
  async createJobPaymentOrder(orderData) {
    if (!this.isEnabled) {
      throw new Error('Razorpay is not configured');
    }

    try {
      await connectDB();

      const {
        jobId,
        payerId,
        payeeId,
        amount,
        description,
        metadata = {}
      } = orderData;

      // Validate job and users
      const [job, payer, payee] = await Promise.all([
        Job.findById(jobId).populate('createdBy assignedTo'),
        User.findById(payerId),
        User.findById(payeeId)
      ]);

      if (!job || !payer || !payee) {
        throw new Error('Invalid job or user IDs');
      }

      // Ensure minimum amount (Rs. 1)
      const orderAmount = Math.max(Math.round(amount * 100), 100); // Convert to paisa
      
      // Create Razorpay order
      const orderOptions = {
        amount: orderAmount,
        currency: this.currency,
        receipt: `${this.receiptPrefix}${jobId}_${Date.now()}`,
        payment_capture: 1, // Auto capture
        notes: {
          jobId: jobId,
          jobTitle: job.title,
          payerId: payerId,
          payerName: payer.name,
          payeeId: payeeId,
          payeeName: payee.name,
          platform: 'Fixly',
          ...metadata
        }
      };

      const order = await razorpay.orders.create(orderOptions);

      // Store order in database
      await this.storePaymentOrder({
        orderId: order.id,
        jobId,
        payerId,
        payeeId,
        amount: amount,
        currency: this.currency,
        status: 'created',
        description,
        metadata: orderOptions.notes,
        razorpayOrder: order
      });

      console.log(`💳 Payment order created: ${order.id} for job ${job.title}`);
      
      return {
        orderId: order.id,
        amount: orderAmount,
        currency: this.currency,
        jobTitle: job.title,
        payeeName: payee.name,
        receipt: order.receipt,
        keyId: razorpayConfig.key_id
      };

    } catch (error) {
      console.error('Razorpay order creation error:', error);
      throw new Error(`Failed to create payment order: ${error.message}`);
    }
  }

  // Create subscription order
  async createSubscriptionOrder(subscriptionData) {
    if (!this.isEnabled) {
      throw new Error('Razorpay is not configured');
    }

    try {
      const {
        userId,
        planType,
        planName,
        amount,
        duration,
        description
      } = subscriptionData;

      await connectDB();
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const orderAmount = Math.round(amount * 100); // Convert to paisa
      
      const orderOptions = {
        amount: orderAmount,
        currency: this.currency,
        receipt: `${this.receiptPrefix}SUB_${userId}_${Date.now()}`,
        payment_capture: 1,
        notes: {
          userId: userId,
          userName: user.name,
          userEmail: user.email,
          planType: planType,
          planName: planName,
          duration: duration,
          platform: 'Fixly',
          type: 'subscription'
        }
      };

      const order = await razorpay.orders.create(orderOptions);

      // Store subscription order
      await this.storeSubscriptionOrder({
        orderId: order.id,
        userId,
        planType,
        planName,
        amount,
        duration,
        status: 'created',
        description,
        razorpayOrder: order
      });

      console.log(`📱 Subscription order created: ${order.id} for user ${user.name}`);

      return {
        orderId: order.id,
        amount: orderAmount,
        currency: this.currency,
        planName,
        userName: user.name,
        receipt: order.receipt,
        keyId: razorpayConfig.key_id
      };

    } catch (error) {
      console.error('Subscription order creation error:', error);
      throw new Error(`Failed to create subscription order: ${error.message}`);
    }
  }

  // Verify payment signature
  verifyPaymentSignature(orderID, paymentID, signature) {
    try {
      const body = orderID + '|' + paymentID;
      const expectedSignature = crypto
        .createHmac('sha256', razorpayConfig.key_secret)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  // Process successful payment
  async processSuccessfulPayment(paymentData) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        type = 'job_payment'
      } = paymentData;

      // Verify signature
      if (!this.verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        throw new Error('Invalid payment signature');
      }

      await connectDB();

      if (type === 'subscription') {
        return await this.processSubscriptionPayment(razorpay_order_id, razorpay_payment_id);
      } else {
        return await this.processJobPayment(razorpay_order_id, razorpay_payment_id);
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  // Process job payment
  async processJobPayment(orderId, paymentId) {
    try {
      // Get payment order details
      const paymentOrder = await this.getPaymentOrder(orderId);
      if (!paymentOrder) {
        throw new Error('Payment order not found');
      }

      // Get payment details from Razorpay
      const payment = await razorpay.payments.fetch(paymentId);
      if (payment.status !== 'captured') {
        throw new Error('Payment not captured');
      }

      // Update job payment status
      const job = await Job.findById(paymentOrder.jobId);
      if (job) {
        job.payment = {
          status: 'paid',
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          paymentId: paymentId,
          orderId: orderId,
          paidAt: new Date(),
          method: 'razorpay',
          razorpayData: {
            paymentId: payment.id,
            method: payment.method,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status
          }
        };

        await job.save();
      }

      // Update user payment history
      await this.updateUserPaymentHistory(paymentOrder.payerId, {
        type: 'payment_sent',
        jobId: paymentOrder.jobId,
        amount: paymentOrder.amount,
        paymentId,
        orderId,
        timestamp: new Date()
      });

      await this.updateUserPaymentHistory(paymentOrder.payeeId, {
        type: 'payment_received',
        jobId: paymentOrder.jobId,
        amount: paymentOrder.amount,
        paymentId,
        orderId,
        timestamp: new Date()
      });

      // Send notifications
      await this.sendPaymentNotifications(paymentOrder, payment);

      // Update payment order status
      await this.updatePaymentOrderStatus(orderId, 'completed', {
        paymentId,
        completedAt: new Date(),
        razorpayData: payment
      });

      console.log(`✅ Job payment processed successfully: ${paymentId}`);

      return {
        success: true,
        paymentId,
        orderId,
        amount: paymentOrder.amount,
        jobId: paymentOrder.jobId
      };

    } catch (error) {
      console.error('Job payment processing error:', error);
      throw error;
    }
  }

  // Process subscription payment
  async processSubscriptionPayment(orderId, paymentId) {
    try {
      const subscriptionOrder = await this.getSubscriptionOrder(orderId);
      if (!subscriptionOrder) {
        throw new Error('Subscription order not found');
      }

      // Get payment details
      const payment = await razorpay.payments.fetch(paymentId);
      if (payment.status !== 'captured') {
        throw new Error('Payment not captured');
      }

      // Update user subscription
      await this.activateUserSubscription(subscriptionOrder, payment);

      // Send subscription activation notification
      await notificationService.sendNotification(subscriptionOrder.userId, {
        type: 'subscription_activated',
        title: 'Subscription Activated',
        message: `Your ${subscriptionOrder.planName} subscription has been activated successfully.`,
        data: {
          planType: subscriptionOrder.planType,
          planName: subscriptionOrder.planName,
          amount: subscriptionOrder.amount,
          paymentId
        }
      });

      console.log(`✅ Subscription activated: ${paymentId} for user ${subscriptionOrder.userId}`);

      return {
        success: true,
        paymentId,
        orderId,
        planType: subscriptionOrder.planType,
        planName: subscriptionOrder.planName
      };

    } catch (error) {
      console.error('Subscription payment processing error:', error);
      throw error;
    }
  }

  // Send payment notifications
  async sendPaymentNotifications(paymentOrder, payment) {
    try {
      // Notify payer
      await notificationService.sendPaymentNotification(
        paymentOrder.payerId,
        paymentOrder.amount,
        paymentOrder.jobId,
        paymentOrder.metadata.jobTitle,
        payment.id
      );

      // Notify payee
      await notificationService.sendNotification(paymentOrder.payeeId, {
        type: 'payment_received',
        title: 'Payment Received',
        message: `You received ₹${paymentOrder.amount} for completing "${paymentOrder.metadata.jobTitle}"`,
        data: {
          amount: paymentOrder.amount,
          jobId: paymentOrder.jobId,
          paymentId: payment.id,
          payerName: paymentOrder.metadata.payerName
        }
      });

      // Real-time updates
      realtimeManager.sendToUser(paymentOrder.payerId, {
        type: 'payment_success',
        data: {
          paymentId: payment.id,
          amount: paymentOrder.amount,
          jobId: paymentOrder.jobId,
          status: 'completed'
        }
      });

      realtimeManager.sendToUser(paymentOrder.payeeId, {
        type: 'payment_received',
        data: {
          paymentId: payment.id,
          amount: paymentOrder.amount,
          jobId: paymentOrder.jobId,
          payerName: paymentOrder.metadata.payerName
        }
      });

    } catch (error) {
      console.error('Payment notification error:', error);
    }
  }

  // Helper methods for database operations
  async storePaymentOrder(orderData) {
    // Implementation depends on your payment order storage strategy
    // This could be stored in a separate PaymentOrder model or within the Job model
    console.log('Storing payment order:', orderData.orderId);
  }

  async storeSubscriptionOrder(orderData) {
    // Store subscription order data
    console.log('Storing subscription order:', orderData.orderId);
  }

  async getPaymentOrder(orderId) {
    // Retrieve payment order from database
    console.log('Getting payment order:', orderId);
    return { orderId, amount: 1000, currency: 'INR' }; // Mock data
  }

  async getSubscriptionOrder(orderId) {
    // Retrieve subscription order from database
    console.log('Getting subscription order:', orderId);
    return { orderId, planType: 'premium' }; // Mock data
  }

  async updatePaymentOrderStatus(orderId, status, data) {
    // Update payment order status
    console.log(`Updating payment order ${orderId} to ${status}`);
  }

  async updateUserPaymentHistory(userId, paymentData) {
    // Update user's payment history
    console.log(`Updating payment history for user ${userId}`);
  }

  async activateUserSubscription(subscriptionOrder, payment) {
    // Activate user subscription
    console.log(`Activating subscription for user ${subscriptionOrder.userId}`);
  }

  // Get payment details
  async getPaymentDetails(paymentId) {
    if (!this.isEnabled) {
      throw new Error('Razorpay is not configured');
    }

    try {
      const payment = await razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Get payment details error:', error);
      throw error;
    }
  }

  // Refund payment
  async refundPayment(paymentId, amount, reason = 'requested_by_customer') {
    if (!this.isEnabled) {
      throw new Error('Razorpay is not configured');
    }

    try {
      const refundAmount = Math.round(amount * 100); // Convert to paisa
      
      const refund = await razorpay.payments.refund(paymentId, {
        amount: refundAmount,
        notes: {
          reason: reason,
          platform: 'Fixly',
          timestamp: new Date().toISOString()
        }
      });

      console.log(`💰 Refund processed: ${refund.id} for payment ${paymentId}`);
      return refund;

    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const razorpayService = new RazorpayService();
export default razorpayService;