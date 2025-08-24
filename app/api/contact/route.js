// app/api/contact/route.js
import { NextResponse } from 'next/server';
import { rateLimit } from '../../../utils/rateLimiting';
import { sendEmail } from '../../../lib/email';
import { sendWhatsAppNotification } from '../../../lib/whatsapp';
import { notifyAdmin } from '../../../lib/admin-notifications';

export async function POST(request) {
  try {
    // Apply rate limiting - 5 contact messages per hour per IP
    const rateLimitResult = await rateLimit(request, 'contact_form', 5, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many contact requests. Please try again later.' },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { name, email, phone, subject, message, category } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { message: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length < 10) {
      return NextResponse.json(
        { message: 'Message must be at least 10 characters long' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { message: 'Message cannot exceed 2000 characters' },
        { status: 400 }
      );
    }

    // Create email content
    const emailSubject = subject || `New Contact Form Message - ${category || 'General'}`;
    const emailContent = `
New Contact Form Submission from Fixly Website

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Category: ${category || 'General'}
Subject: ${subject || 'No subject'}

Message:
${message}

---
This message was sent through the Fixly contact form.
Reply directly to this email to respond to ${name}.
    `.trim();

    // Send email to the business owner
    try {
      await sendEmail({
        to: 'blessancorley@gmail.com',
        subject: emailSubject,
        text: emailContent,
        replyTo: email // Allow direct reply to the sender
      });
    } catch (emailError) {
      console.error('Failed to send contact email:', emailError.message);
      
      // Don't expose email service errors to the user
      return NextResponse.json(
        { message: 'Failed to send message. Please try again later or contact us directly.' },
        { status: 500 }
      );
    }

    // Send admin notifications (email + WhatsApp)
    try {
      await notifyAdmin('CONTACT_FORM_SUBMISSION', {
        name,
        email,
        phone,
        category,
        subject,
        message
      });
    } catch (notificationError) {
      // Admin notifications are optional - don't fail the request
      console.warn('Admin notification failed:', notificationError.message);
    }

    // Send confirmation email to the user
    try {
      const confirmationSubject = 'Thank you for contacting Fixly - We\'ve received your message';
      const confirmationContent = `
Hi ${name},

Thank you for reaching out to Fixly! We've received your message and will get back to you as soon as possible.

Your message details:
Subject: ${subject || 'No subject'}
Category: ${category || 'General'}

We typically respond within 24 hours during business days. If you have an urgent matter, please call us at +91 9976768211.

Best regards,
The Fixly Team

---
This is an automated confirmation email. Please do not reply to this email.
For immediate assistance, contact us at blessancorley@gmail.com or +91 9976768211.
      `.trim();

      await sendEmail({
        to: email,
        subject: confirmationSubject,
        text: confirmationContent,
        from: 'blessancorley@gmail.com'
      });
    } catch (confirmationError) {
      // Log error but don't fail the main request
      console.error('Failed to send confirmation email:', confirmationError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    
    return NextResponse.json(
      { message: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}