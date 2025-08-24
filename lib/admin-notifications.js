// Admin notification system for important events
import { sendEmail } from './email';
import { sendWhatsAppNotification } from './whatsapp';

// Admin contact information
const ADMIN_EMAIL = 'blessancorley@gmail.com';
const ADMIN_WHATSAPP = '919976768211';

/**
 * Send notifications to admin for critical events
 */
export async function notifyAdmin(eventType, data) {
  const notifications = [];
  
  try {
    switch (eventType) {
      case 'CONTACT_FORM_SUBMISSION':
        notifications.push(handleContactFormSubmission(data));
        break;
      
      case 'NEW_USER_REGISTRATION':
        notifications.push(handleNewUserRegistration(data));
        break;
      
      case 'JOB_POSTED':
        notifications.push(handleJobPosted(data));
        break;
      
      case 'PAYMENT_ISSUE':
        notifications.push(handlePaymentIssue(data));
        break;
      
      case 'DISPUTE_CREATED':
        notifications.push(handleDisputeCreated(data));
        break;
      
      case 'SYSTEM_ERROR':
        notifications.push(handleSystemError(data));
        break;
      
      default:
        console.warn(`Unknown admin notification event type: ${eventType}`);
    }
    
    // Execute all notifications
    await Promise.allSettled(notifications);
    
  } catch (error) {
    console.error('Admin notification failed:', error);
  }
}

async function handleContactFormSubmission(data) {
  const { name, email, phone, category, subject, message } = data;
  
  // Email notification (already handled in contact API, but keeping here for completeness)
  const emailPromise = sendEmail({
    to: ADMIN_EMAIL,
    subject: `🔔 New Contact Form: ${subject || category || 'General Inquiry'}`,
    text: `New contact form submission from ${name} (${email})\n\nCategory: ${category}\nPhone: ${phone || 'Not provided'}\n\nMessage:\n${message}`
  });
  
  // WhatsApp notification
  const whatsappPromise = sendWhatsAppNotification({
    phoneNumber: ADMIN_WHATSAPP,
    message: `🔔 *New Fixly Contact Message*\n\n👤 From: ${name}\n📧 Email: ${email}\n📂 Category: ${category || 'General'}\n\n💬 Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}\n\n📧 Check email for full details.`
  });
  
  return Promise.allSettled([emailPromise, whatsappPromise]);
}

async function handleNewUserRegistration(data) {
  const { userName, userEmail, userRole, userLocation } = data;
  
  const message = `🎉 *New Fixly User Registration*\n\n👤 Name: ${userName}\n📧 Email: ${userEmail}\n👷 Role: ${userRole}\n📍 Location: ${userLocation || 'Not provided'}\n\n🚀 Welcome the new ${userRole} to Fixly!`;
  
  return sendWhatsAppNotification({
    phoneNumber: ADMIN_WHATSAPP,
    message
  });
}

async function handleJobPosted(data) {
  const { jobTitle, hirerName, budget, location, urgency } = data;
  
  const message = `💼 *New Job Posted on Fixly*\n\n📋 Title: ${jobTitle}\n👤 Posted by: ${hirerName}\n💰 Budget: ${budget}\n📍 Location: ${location}\n⏰ Urgency: ${urgency}\n\n🔗 Check the dashboard for details.`;
  
  return sendWhatsAppNotification({
    phoneNumber: ADMIN_WHATSAPP,
    message
  });
}

async function handlePaymentIssue(data) {
  const { userId, amount, error, transactionId } = data;
  
  const emailPromise = sendEmail({
    to: ADMIN_EMAIL,
    subject: '🚨 URGENT: Payment Issue on Fixly',
    text: `Payment issue detected:\n\nUser ID: ${userId}\nAmount: ${amount}\nError: ${error}\nTransaction ID: ${transactionId}\n\nImmediate attention required!`
  });
  
  const whatsappPromise = sendWhatsAppNotification({
    phoneNumber: ADMIN_WHATSAPP,
    message: `🚨 *URGENT: Payment Issue*\n\n💰 Amount: ${amount}\n👤 User: ${userId}\n❌ Error: ${error}\n\n⚡ Immediate attention required!`
  });
  
  return Promise.allSettled([emailPromise, whatsappPromise]);
}

async function handleDisputeCreated(data) {
  const { jobTitle, disputeReason, involvedUsers } = data;
  
  const message = `⚖️ *New Dispute Created*\n\n📋 Job: ${jobTitle}\n❓ Reason: ${disputeReason}\n👥 Users: ${involvedUsers.join(', ')}\n\n🔍 Review required in dispute management.`;
  
  return sendWhatsAppNotification({
    phoneNumber: ADMIN_WHATSAPP,
    message
  });
}

async function handleSystemError(data) {
  const { error, endpoint, userId, severity } = data;
  
  if (severity === 'critical') {
    const emailPromise = sendEmail({
      to: ADMIN_EMAIL,
      subject: '🚨 CRITICAL: System Error on Fixly',
      text: `Critical system error:\n\nError: ${error}\nEndpoint: ${endpoint}\nUser ID: ${userId}\nTime: ${new Date().toISOString()}\n\nImmediate investigation required!`
    });
    
    const whatsappPromise = sendWhatsAppNotification({
      phoneNumber: ADMIN_WHATSAPP,
      message: `🚨 *CRITICAL SYSTEM ERROR*\n\n❌ ${error}\n🔗 ${endpoint}\n\n⚡ Check logs immediately!`
    });
    
    return Promise.allSettled([emailPromise, whatsappPromise]);
  }
  
  return Promise.resolve();
}

/**
 * Test admin notification system
 */
export async function testAdminNotifications() {
  console.log('Testing admin notification system...');
  
  try {
    await notifyAdmin('CONTACT_FORM_SUBMISSION', {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      category: 'Technical Support',
      subject: 'Test Notification',
      message: 'This is a test message to verify the admin notification system is working correctly.'
    });
    
    console.log('✅ Admin notification test completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Admin notification test failed:', error);
    return false;
  }
}