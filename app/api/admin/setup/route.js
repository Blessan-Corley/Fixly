// app/api/admin/setup/route.js
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';

export async function POST(request) {
  try {
    const body = await request.json();
    const { setupKey, adminData } = body;

    // Security check - only allow if no admin exists yet
    await connectDB();
    
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return NextResponse.json(
        { message: 'Admin already exists' },
        { status: 400 }
      );
    }

    // Check setup key (you can change this to any secret key)
    const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || 'fixly_admin_setup_2025';
    if (setupKey !== ADMIN_SETUP_KEY) {
      return NextResponse.json(
        { message: 'Invalid setup key' },
        { status: 401 }
      );
    }

    const { name, username, email, password } = adminData;

    // Validation
    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if email/username already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email or username already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
    const admin = new User({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      role: 'admin',
      phone: '+91' + '9999999999', // Default admin phone
      location: {
        city: 'Coimbatore',
        state: 'Tamil Nadu'
      },
      isVerified: true,
      plan: {
        type: 'pro',
        status: 'active'
      }
    });

    await admin.save();

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { message: 'Failed to create admin account' },
      { status: 500 }
    );
  }
}