import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

/**
 * Create Test Users for Comprehensive Testing
 * Creates one Hirer and one Fixer with known credentials
 */
export async function POST(request) {
  try {
    await connectDB();

    const testUsers = [
      {
        name: 'Test Hirer User',
        email: 'test-hirer@fixly.test',
        username: 'testhirer',
        password: 'TestHirer@123',
        phone: '9876543210',
        role: 'hirer',
        authMethod: 'email',
        isVerified: true,
        emailVerified: true,
        accountStatus: 'active'
      },
      {
        name: 'Test Fixer User',
        email: 'test-fixer@fixly.test',
        username: 'testfixer',
        password: 'TestFixer@123',
        phone: '9876543211',
        role: 'fixer',
        authMethod: 'email',
        isVerified: true,
        emailVerified: true,
        accountStatus: 'active',
        skills: ['plumbing', 'electrical', 'carpentry'],
        bio: 'Test fixer for comprehensive testing',
        hourlyRate: 500,
        availability: 'available'
      }
    ];

    const createdUsers = [];
    const errors = [];

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existing = await User.findOne({
          $or: [
            { email: userData.email },
            { username: userData.username }
          ]
        });

        if (existing) {
          // Update existing user instead
          const hashedPassword = await bcrypt.hash(userData.password, 12);
          existing.passwordHash = hashedPassword;
          existing.isVerified = true;
          existing.emailVerified = true;
          existing.accountStatus = 'active';
          if (userData.skills) existing.skills = userData.skills;
          if (userData.bio) existing.bio = userData.bio;
          if (userData.hourlyRate) existing.hourlyRate = userData.hourlyRate;
          if (userData.availability) existing.availability = userData.availability;

          await existing.save();

          createdUsers.push({
            status: 'UPDATED',
            user: {
              id: existing._id,
              name: existing.name,
              email: existing.email,
              username: existing.username,
              role: existing.role,
              credentials: {
                email: userData.email,
                password: userData.password
              }
            }
          });
        } else {
          // Create new user
          const hashedPassword = await bcrypt.hash(userData.password, 12);

          const newUser = new User({
            ...userData,
            passwordHash: hashedPassword
          });

          // Remove plain password from object before saving
          delete newUser.password;

          await newUser.save();

          createdUsers.push({
            status: 'CREATED',
            user: {
              id: newUser._id,
              name: newUser.name,
              email: newUser.email,
              username: newUser.username,
              role: newUser.role,
              credentials: {
                email: userData.email,
                password: userData.password
              }
            }
          });
        }
      } catch (error) {
        errors.push({
          email: userData.email,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test users ready',
      users: createdUsers,
      errors: errors.length > 0 ? errors : undefined,
      totalCreated: createdUsers.filter(u => u.status === 'CREATED').length,
      totalUpdated: createdUsers.filter(u => u.status === 'UPDATED').length,
      instructions: {
        hirer: {
          email: 'test-hirer@fixly.test',
          password: 'TestHirer@123',
          role: 'hirer',
          loginUrl: 'http://localhost:3000/auth/signin'
        },
        fixer: {
          email: 'test-fixer@fixly.test',
          password: 'TestFixer@123',
          role: 'fixer',
          loginUrl: 'http://localhost:3000/auth/signin'
        }
      }
    });

  } catch (error) {
    console.error('Test users creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Delete test users (cleanup)
 */
export async function DELETE() {
  try {
    await connectDB();

    const result = await User.deleteMany({
      email: {
        $in: ['test-hirer@fixly.test', 'test-fixer@fixly.test']
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Test users deleted',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Test users deletion error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
