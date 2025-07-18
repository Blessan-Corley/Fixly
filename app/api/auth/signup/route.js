// app/api/auth/signup/route.js
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';
import nodemailer from 'nodemailer';

// Email transporter
const transporter = nodemailer.createTransporter({
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
    const rateLimitResult = await rateLimit(request, 'signup', 10, 60 * 60 * 1000); // 10 signups per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      name,
      username,
      email,
      phone,
      password,
      role,
      location,
      skills,
      authMethod,
      termsAccepted
    } = body;

    // Validation
    if (!name || !username || !email || !phone || !role || !location || !termsAccepted) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['hirer', 'fixer'].includes(role)) {
      return NextResponse.json(
        { message: 'Invalid role' },
        { status: 400 }
      );
    }

    if (role === 'fixer' && (!skills || skills.length === 0)) {
      return NextResponse.json(
        { message: 'Fixers must select at least one skill' },
        { status: 400 }
      );
    }

    if (authMethod === 'email' && !password) {
      return NextResponse.json(
        { message: 'Password is required for email registration' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone format
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { message: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() },
        { phone: `+91${cleanPhone}` }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json(
          { message: 'Email is already registered' },
          { status: 409 }
        );
      }
      if (existingUser.username === username.toLowerCase()) {
        return NextResponse.json(
          { message: 'Username is already taken' },
          { status: 409 }
        );
      }
      if (existingUser.phone === `+91${cleanPhone}`) {
        return NextResponse.json(
          { message: 'Phone number is already registered' },
          { status: 409 }
        );
      }
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 12);
    }

    // Create user
    const userData = {
      name: name.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      phone: `+91${cleanPhone}`,
      role,
      location: {
        city: location.name.split(',')[0].trim(),
        state: location.state,
        lat: location.lat,
        lng: location.lng
      },
      isVerified: false,
      banned: false,
      availableNow: role === 'fixer',
      plan: {
        type: 'free',
        status: 'active',
        creditsUsed: 0
      }
    };

    if (passwordHash) {
      userData.passwordHash = passwordHash;
    }

    if (role === 'fixer' && skills) {
      userData.skills = skills.map(skill => skill.toLowerCase().trim());
    }

    const user = new User(userData);
    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
      // Don't fail registration if email fails
    }

    // Add welcome notification
    await user.addNotification(
      'welcome',
      'Welcome to Fixly!',
      `Welcome ${name}! Your account has been created successfully. ${role === 'fixer' ? 'You have 3 free job applications to get started.' : 'Start posting jobs to find skilled professionals.'}`
    );

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}

async function sendWelcomeEmail(user) {
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
        .tips { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; color: #374650;">Welcome to Fixly!</h1>
        </div>
        <div class="content">
          <h2>Hi ${user.name}! 👋</h2>
          <p>Welcome to Fixly, India's trusted hyperlocal service marketplace! We're excited to have you join our community.</p>
          
          ${user.role === 'fixer' ? `
            <div class="tips">
              <h3>🔧 Getting Started as a Fixer:</h3>
              <ul>
                <li><strong>You have 3 free job applications</strong> to get started</li>
                <li>Complete your profile to build trust with hirers</li>
                <li>Apply quickly to new job postings for better chances</li>
                <li>Provide competitive quotes with clear timelines</li>
                <li>Upload portfolio photos to showcase your work</li>
              </ul>
              <p><strong>Pro Tip:</strong> Upgrade to Pro for ₹99/month to get unlimited job applications!</p>
            </div>
          ` : `
            <div class="tips">
              <h3>🏠 Getting Started as a Hirer:</h3>
              <ul>
                <li>Post detailed job descriptions with clear photos</li>
                <li>Set realistic budgets to attract quality fixers</li>
                <li>Respond quickly to applications</li>
                <li>Communicate clearly with fixers before hiring</li>
                <li>Leave honest reviews after job completion</li>
              </ul>
              <p><strong>Note:</strong> You can post one job every 6 hours to ensure quality.</p>
            </div>
          `}
          
          <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">Go to Dashboard</a>
          
          <p>If you have any questions, our support team is here to help. Just reply to this email!</p>
          
          <p>Best regards,<br>The Fixly Team</p>
        </div>
        <div class="footer">
          <p style="margin: 0; font-size: 14px; color: #5a6c75;">
            This email was sent to ${user.email}. 
            <a href="${process.env.NEXTAUTH_URL}/unsubscribe" style="color: #374650;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Fixly" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Welcome to Fixly! 🔧 Let\'s get you started',
    html: emailTemplate,
  });
}