// utils/emailService.js - Enhanced with Redis caching and rate limiting
import nodemailer from 'nodemailer';
import { redisRateLimit, redisUtils } from '../lib/redis';

// Create transporter using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Email templates
const emailTemplates = {
  emailVerification: (name, token, isOTP = false) => {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    if (isOTP) {
      return {
        subject: 'Verify Your Email - Fixly',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0F766E; margin: 0;">Fixly</h1>
              <p style="color: #6B7280; margin: 5px 0;">Connecting you with skilled professionals</p>
            </div>
            
            <div style="background: #F0FDFA; border: 1px solid #0F766E; border-radius: 12px; padding: 30px; text-align: center;">
              <h2 style="color: #0F766E; margin-bottom: 20px;">Verify Your Email Address</h2>
              <p style="color: #374151; margin-bottom: 25px;">Hello ${name},</p>
              <p style="color: #374151; margin-bottom: 25px;">
                Thank you for signing up with Fixly! Please use the verification code below to verify your email address:
              </p>
              
              <div style="background: white; border: 2px solid #0F766E; border-radius: 8px; padding: 20px; margin: 25px 0; display: inline-block;">
                <h1 style="color: #0F766E; font-size: 32px; letter-spacing: 8px; margin: 0; font-family: monospace;">${token}</h1>
              </div>
              
              <p style="color: #6B7280; font-size: 14px; margin-top: 25px;">
                This code will expire in 5 minutes for security reasons.
              </p>
              <p style="color: #6B7280; font-size: 14px;">
                If you didn't create an account with Fixly, you can safely ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 12px;">
                © 2024 Fixly. All rights reserved.<br>
                This is an automated email. Please do not reply.
              </p>
            </div>
          </div>
        `
      };
    } else {
      const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;
      return {
        subject: 'Verify Your Email - Fixly',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0F766E; margin: 0;">Fixly</h1>
              <p style="color: #6B7280; margin: 5px 0;">Connecting you with skilled professionals</p>
            </div>
            
            <div style="background: #F0FDFA; border: 1px solid #0F766E; border-radius: 12px; padding: 30px;">
              <h2 style="color: #0F766E; margin-bottom: 20px;">Verify Your Email Address</h2>
              <p style="color: #374151; margin-bottom: 20px;">Hello ${name},</p>
              <p style="color: #374151; margin-bottom: 25px;">
                Thank you for signing up with Fixly! Please click the button below to verify your email address and complete your registration:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: #0F766E; color: white; padding: 14px 28px; text-decoration: none; 
                          border-radius: 8px; font-weight: bold; display: inline-block; 
                          font-size: 16px;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px; margin-top: 25px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #0F766E; font-size: 14px; word-break: break-all;">
                ${verificationUrl}
              </p>
              
              <p style="color: #6B7280; font-size: 14px; margin-top: 25px;">
                This link will expire in 24 hours for security reasons.
              </p>
              <p style="color: #6B7280; font-size: 14px;">
                If you didn't create an account with Fixly, you can safely ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 12px;">
                © 2024 Fixly. All rights reserved.<br>
                This is an automated email. Please do not reply.
              </p>
            </div>
          </div>
        `
      };
    }
  },

  welcomeEmail: (name) => ({
    subject: 'Welcome to Fixly! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0F766E; margin: 0;">Welcome to Fixly! 🎉</h1>
        </div>
        
        <div style="background: #F0FDFA; border-radius: 12px; padding: 30px;">
          <h2 style="color: #0F766E;">Hello ${name}!</h2>
          <p style="color: #374151;">
            Congratulations! Your email has been successfully verified and your Fixly account is now active.
          </p>
          
          <div style="margin: 25px 0;">
            <h3 style="color: #0F766E;">What's Next?</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>Complete your profile to get better job matches</li>
              <li>Explore available jobs in your area</li>
              <li>Connect with trusted professionals</li>
              <li>Start building your reputation</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}/dashboard" 
               style="background: #0F766E; color: white; padding: 14px 28px; text-decoration: none; 
                      border-radius: 8px; font-weight: bold; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    `
  }),

  passwordResetOTP: (name, otp) => ({
    subject: 'Password Reset Code - Fixly',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #DC2626; margin: 0;">🔐 Password Reset</h1>
          <p style="color: #6B7280; margin: 5px 0;">Secure your account with a new password</p>
        </div>
        
        <div style="background: #FEF2F2; border: 1px solid #DC2626; border-radius: 12px; padding: 30px; text-align: center;">
          <h2 style="color: #DC2626; margin-bottom: 20px;">Password Reset Code</h2>
          <p style="color: #374151; margin-bottom: 25px;">Hello ${name},</p>
          <p style="color: #374151; margin-bottom: 25px;">
            Use the code below to reset your password:
          </p>
          
          <div style="background: white; border: 2px solid #DC2626; border-radius: 8px; padding: 20px; margin: 25px 0; display: inline-block;">
            <h1 style="color: #DC2626; font-size: 32px; letter-spacing: 8px; margin: 0; font-family: monospace;">${otp}</h1>
          </div>
          
          <p style="color: #6B7280; font-size: 14px; margin-top: 25px;">
            This code will expire in 10 minutes for security reasons.
          </p>
          <p style="color: #6B7280; font-size: 14px;">
            If you didn't request this reset, you can safely ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
          <p style="color: #9CA3AF; font-size: 12px;">
            © 2024 Fixly. All rights reserved.<br>
            This is an automated email. Please do not reply.
          </p>
        </div>
      </div>
    `
  })
};

// Enhanced send email function with Redis caching and rate limiting
export const sendEmail = async (to, template, templateData = {}, options = {}) => {
  try {
    // Enhanced rate limiting per email address
    const rateLimitResult = await redisRateLimit(`email_send:${to}`, 10, 3600); // 10 emails per hour per address
    if (!rateLimitResult.success && !options.bypassRateLimit) {
      console.log(`🚫 Email rate limit exceeded for ${to}`);
      return {
        success: false,
        error: 'Email rate limit exceeded. Please try again later.',
        resetTime: new Date(rateLimitResult.resetTime).toISOString()
      };
    }

    // Check if we recently sent the same email to prevent spam
    const dedupeKey = `email_sent:${to}:${template}:${JSON.stringify(templateData)}`;
    const recentlySent = await redisUtils.get(dedupeKey);
    if (recentlySent && !options.forceSend) {
      console.log(`⚠️  Duplicate email prevented for ${to} (${template})`);
      return {
        success: false,
        error: 'Email was recently sent. Please wait before requesting again.',
        duplicate: true
      };
    }

    // Cache transporter verification to avoid repeated checks
    const transporterCacheKey = 'email_transporter_verified';
    let transporterVerified = await redisUtils.get(transporterCacheKey);

    const transporter = createTransporter();

    if (!transporterVerified) {
      await transporter.verify();
      await redisUtils.set(transporterCacheKey, true, 300); // Cache for 5 minutes
      console.log('📧 Email transporter verified and cached');
    }
    
    let emailContent;
    switch (template) {
      case 'emailVerification':
        emailContent = emailTemplates.emailVerification(templateData.name, templateData.token, templateData.isOTP);
        break;
      case 'welcome':
        emailContent = emailTemplates.welcomeEmail(templateData.name);
        break;
      case 'passwordResetOTP':
        emailContent = emailTemplates.passwordResetOTP(templateData.name, templateData.otp);
        break;
      default:
        throw new Error(`Unknown email template: ${template}`);
    }

    const mailOptions = {
      from: {
        name: 'Fixly',
        address: process.env.EMAIL_USER
      },
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);

    // Cache successful send to prevent duplicates (15 minutes for most templates)
    const cacheTime = template === 'emailVerification' ? 300 : 900; // 5 min for OTP, 15 min for others
    await redisUtils.set(dedupeKey, true, cacheTime);

    // Log email metrics for analytics
    const metricsKey = `email_metrics:${template}:${new Date().toISOString().split('T')[0]}`;
    await redisUtils.incr(metricsKey, 86400); // Daily metrics

    console.log(`✅ Email sent successfully: ${template} to ${to}`);

    return {
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      cached: true
    };

  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send verification email
export const sendVerificationEmail = async (email, name, token, isOTP = false) => {
  return sendEmail(email, 'emailVerification', { name, token, isOTP });
};

// Send welcome email
export const sendWelcomeEmail = async (email, name) => {
  return sendEmail(email, 'welcome', { name });
};

// Send password reset OTP
export const sendPasswordResetOTP = async (email, name, otp) => {
  return sendEmail(email, 'passwordResetOTP', { name, otp });
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetOTP
};