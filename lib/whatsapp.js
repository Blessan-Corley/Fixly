// WhatsApp notification service
// This uses a simple approach - you can enhance with WhatsApp Business API later

/**
 * Send WhatsApp notification using various methods
 * For now, we'll use a webhook approach or direct API call
 */

export async function sendWhatsAppNotification({ phoneNumber, message }) {
  try {
    // Method 1: Using WhatsApp Business Cloud API (if you have access)
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return await sendViaBusinessAPI(phoneNumber, message);
    }
    
    // Method 2: Using a third-party service like Twilio WhatsApp API
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      return await sendViaTwilio(phoneNumber, message);
    }
    
    // Method 3: Simple webhook to an external service
    if (process.env.WHATSAPP_WEBHOOK_URL) {
      return await sendViaWebhook(phoneNumber, message);
    }
    
    // Method 4: Email-to-WhatsApp bridge (backup method)
    return await sendViaEmailBridge(phoneNumber, message);
    
  } catch (error) {
    console.error('WhatsApp notification failed:', error);
    throw error;
  }
}

async function sendViaBusinessAPI(phoneNumber, message) {
  const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: { body: message }
    })
  });
  
  if (!response.ok) {
    throw new Error(`WhatsApp Business API error: ${response.statusText}`);
  }
  
  return await response.json();
}

async function sendViaTwilio(phoneNumber, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: twilioWhatsAppNumber,
      To: `whatsapp:+${phoneNumber}`,
      Body: message
    })
  });
  
  if (!response.ok) {
    throw new Error(`Twilio WhatsApp error: ${response.statusText}`);
  }
  
  return await response.json();
}

async function sendViaWebhook(phoneNumber, message) {
  const response = await fetch(process.env.WHATSAPP_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WHATSAPP_WEBHOOK_TOKEN || ''}`
    },
    body: JSON.stringify({
      phone: phoneNumber,
      message: message,
      source: 'fixly-contact-form'
    })
  });
  
  if (!response.ok) {
    throw new Error(`WhatsApp webhook error: ${response.statusText}`);
  }
  
  return await response.json();
}

async function sendViaEmailBridge(phoneNumber, message) {
  // This is a fallback method that sends an email to yourself with WhatsApp instructions
  // You can then manually forward to WhatsApp or set up an automated system
  
  const { sendEmail } = await import('./email');
  
  const subject = '📱 WhatsApp Notification - New Contact Form Message';
  const emailBody = `
WhatsApp Notification Request:

Phone: +${phoneNumber}
Message: ${message}

---
Forward this message to WhatsApp manually or set up automated forwarding.

Quick WhatsApp link: https://wa.me/${phoneNumber}?text=${encodeURIComponent('Hi! You have a new message from your Fixly contact form. Check your email for details.')}
  `.trim();
  
  await sendEmail({
    to: 'blessancorley@gmail.com',
    subject: subject,
    text: emailBody
  });
  
  return { success: true, method: 'email-bridge' };
}

// Utility function to validate phone numbers
export function validatePhoneNumber(phoneNumber) {
  // Remove any non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Should start with + or be at least 10 digits
  if (cleaned.startsWith('+') && cleaned.length >= 11) {
    return cleaned.substring(1); // Remove the + for API calls
  }
  
  if (cleaned.length >= 10) {
    return cleaned;
  }
  
  throw new Error('Invalid phone number format');
}