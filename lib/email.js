// lib/email.js - Email service configuration
import nodemailer from 'nodemailer';

// Create transporter using environment variables
export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Email templates
const emailTemplates = {
  welcomeFixer: (name, baseUrl = 'http://localhost:3000') => ({
    subject: '🔧 Welcome to Fixly - Start Your Journey as a Professional Fixer!',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🔧 Welcome to Fixly!</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Ready to showcase your skills and grow your business?</p>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${name}! 👋</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Congratulations on joining Fixly as a Professional Service Provider! You're now part of a growing community of skilled professionals who are transforming how services are delivered in India.
          </p>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin-top: 0;">🚀 Your Journey Starts Here:</h3>
            <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
              <li><strong>Complete Your Professional Profile:</strong> Add your skills, experience, portfolio, and availability</li>
              <li><strong>Set Your Service Areas:</strong> Choose your preferred locations and job categories</li>
              <li><strong>Browse Premium Job Opportunities:</strong> Access exclusive jobs posted by verified clients</li>
              <li><strong>Submit Winning Proposals:</strong> Use our proposal templates to stand out</li>
              <li><strong>Build Your Reputation:</strong> Earn 5-star reviews and grow your business</li>
            </ul>
          </div>

          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 25px;">
            <p style="color: #065f46; margin: 0; font-weight: 500;">
              💡 <strong>Pro Tip:</strong> Fixers with complete profiles get 3x more job applications! Take 5 minutes to set up your profile today.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/dashboard" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Complete My Profile →
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 14px;">
            <p><strong>Need Help Getting Started?</strong></p>
            <p>• Watch our Quick Start Guide for Fixers</p>
            <p>• Join our Fixer Community WhatsApp Group</p>
            <p>• Contact our support team at support@fixly.com</p>
          </div>

          <p style="color: #4b5563; margin-top: 30px; font-size: 16px;">
            Welcome to the future of service delivery!<br>
            <strong>The Fixly Team</strong>
          </p>
        </div>
      </div>
    `
  }),

  welcomeHirer: (name, baseUrl = 'http://localhost:3000') => ({
    subject: '🏠 Welcome to Fixly - Your Trusted Home Services Partner!',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🏠 Welcome to Fixly!</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your reliable partner for all home services</p>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${name}! 👋</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Welcome to Fixly! You've just joined thousands of homeowners who trust us for their service needs. Whether it's a quick repair, home improvement, or regular maintenance, we've got you covered with verified professionals.
          </p>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin-top: 0;">🎯 How Fixly Works for You:</h3>
            <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
              <li><strong>Post Your Job:</strong> Describe what you need fixed or installed</li>
              <li><strong>Get Multiple Quotes:</strong> Receive proposals from verified professionals</li>
              <li><strong>Choose Your Fixer:</strong> Compare ratings, reviews, and prices</li>
              <li><strong>Track Progress:</strong> Monitor your job from start to completion</li>
              <li><strong>Pay Securely:</strong> Release payment only when you're satisfied</li>
            </ul>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
            <p style="color: #92400e; margin: 0; font-weight: 500;">
              ⭐ <strong>Quality Guarantee:</strong> All our fixers are background-verified and insurance-backed. Your satisfaction is our priority!
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/dashboard" style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Get Started →
            </a>
          </div>

          <div style="display: flex; gap: 20px; margin: 25px 0;">
            <div style="flex: 1; text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #1f2937;">500+</div>
              <div style="font-size: 12px; color: #6b7280;">Verified Fixers</div>
            </div>
            <div style="flex: 1; text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #1f2937;">50+</div>
              <div style="font-size: 12px; color: #6b7280;">Service Categories</div>
            </div>
            <div style="flex: 1; text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #1f2937;">4.8★</div>
              <div style="font-size: 12px; color: #6b7280;">Average Rating</div>
            </div>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 14px;">
            <p><strong>Popular Services:</strong></p>
            <p>• Plumbing & Electrical Repairs • AC & Appliance Service • Home Cleaning • Painting & Carpentry • Pest Control • And much more!</p>
          </div>

          <p style="color: #4b5563; margin-top: 30px; font-size: 16px;">
            Ready to get your home fixed?<br>
            <strong>The Fixly Team</strong>
          </p>
        </div>
      </div>
    `
  }),

  passwordReset: (name, resetLink) => ({
    subject: '🔐 Reset Your Fixly Password',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Secure your account with a new password</p>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${name}!</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            We received a request to reset your Fixly account password. Click the button below to create a new password:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Reset My Password →
            </a>
          </div>

          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 25px;">
            <p style="color: #7f1d1d; margin: 0; font-size: 14px;">
              <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If the button doesn't work, copy and paste this link: <br>
            <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
          </p>

          <p style="color: #4b5563; margin-top: 30px; font-size: 16px;">
            Stay secure,<br>
            <strong>The Fixly Team</strong>
          </p>
        </div>
      </div>
    `
  }),

  emailVerification: (name, verificationLink) => ({
    subject: '✅ Verify Your Fixly Email Address',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">✅ Verify Your Email</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">One more step to activate your account</p>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${name}!</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Thank you for signing up with Fixly! To complete your registration and secure your account, please verify your email address by clicking the button below:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Verify My Email →
            </a>
          </div>

          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 25px;">
            <p style="color: #065f46; margin: 0; font-size: 14px;">
              <strong>Why verify?</strong> Email verification helps us keep your account secure and ensures you receive important updates about your jobs and services.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If the button doesn't work, copy and paste this link: <br>
            <a href="${verificationLink}" style="color: #10b981; word-break: break-all;">${verificationLink}</a>
          </p>

          <p style="color: #4b5563; margin-top: 30px; font-size: 16px;">
            Thanks for choosing Fixly!<br>
            <strong>The Fixly Team</strong>
          </p>
        </div>
      </div>
    `
  })
};

// Send welcome email based on user role
export async function sendWelcomeEmail(user) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const template = user.role === 'fixer' 
      ? emailTemplates.welcomeFixer(user.name, baseUrl)
      : emailTemplates.welcomeHirer(user.name, baseUrl);

    const info = await transporter.sendMail({
      from: `"Fixly Team" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Welcome email sent:', info.messageId);
    }
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(user, resetLink) {
  try {
    const template = emailTemplates.passwordReset(user.name, resetLink);

    const info = await transporter.sendMail({
      from: `"Fixly Team" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Password reset email sent:', info.messageId);
    }
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return false;
  }
}

// Send email verification
export async function sendEmailVerification(user, verificationLink) {
  try {
    const template = emailTemplates.emailVerification(user.name, verificationLink);

    const info = await transporter.sendMail({
      from: `"Fixly Team" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Email verification sent:', info.messageId);
    }
    return true;
  } catch (error) {
    console.error('❌ Error sending email verification:', error);
    return false;
  }
}

// Generic send email function
export async function sendEmail({ to, subject, text, html, replyTo, from }) {
  try {
    const mailOptions = {
      from: from || `"Fixly Support" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      replyTo: replyTo || undefined,
      // Anti-spam headers
      headers: {
        'X-Mailer': 'Fixly Platform',
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Message-ID': `<${Date.now()}.${Math.random()}@fixly.com>`,
        'List-Unsubscribe': `<mailto:unsubscribe@fixly.com>`,
        'Return-Path': process.env.EMAIL_USER
      }
    };

    // Add text or HTML content with proper formatting
    if (html) {
      mailOptions.html = html;
      // Always include plain text version for better deliverability
      if (!text) {
        mailOptions.text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      } else {
        mailOptions.text = text;
      }
    } else if (text) {
      mailOptions.text = text;
    } else {
      throw new Error('Either text or html content is required');
    }

    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Email sent successfully:', info.messageId);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

// Verify email configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ Email configuration verified');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
}