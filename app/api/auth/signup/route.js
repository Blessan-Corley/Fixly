// app/api/auth/signup/route.js - ENHANCED WITH VALIDATION
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';
import { validateSignupForm, detectFakeAccount } from '@/utils/validation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'signup', 5, 60 * 60 * 1000); // 5 signups per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    console.log('📝 Signup request received:', {
      authMethod: body.authMethod,
      email: body.email,
      role: body.role,
      hasLocation: !!body.location,
      hasSkills: !!body.skills,
    });

    // Get current session for Google auth verification
    const session = await getServerSession(authOptions);

    // ✅ ENHANCED VALIDATION: Use comprehensive validation system
    const validation = validateSignupForm(body);
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return NextResponse.json(
        { 
          message: 'Validation failed',
          errors: validation.errors,
          details: Object.values(validation.errors).join(', ')
        },
        { status: 400 }
      );
    }

    const { validatedData } = validation;
    
    // ✅ ANTI-ABUSE: Detect fake account patterns
    const fakeAccountCheck = detectFakeAccount(validatedData);
    if (fakeAccountCheck.isSuspicious) {
      console.log('🚨 Suspicious account detected:', fakeAccountCheck.indicators);
      return NextResponse.json(
        { message: 'Please provide valid information for account creation' },
        { status: 400 }
      );
    }

    // Validate auth method specific requirements
    if (body.authMethod === 'email' && !body.password) {
      return NextResponse.json(
        { message: 'Password is required for email registration' },
        { status: 400 }
      );
    }

    if (body.authMethod === 'google') {
      if (!session || !session.user || session.user.email !== validatedData.email) {
        return NextResponse.json(
          { message: 'Invalid Google authentication session' },
          { status: 401 }
        );
      }
    }

    await connectDB();

    // ✅ COMPREHENSIVE DUPLICATE CHECK
    const existingUser = await User.findOne({
      $or: [
        { email: validatedData.email },
        { username: validatedData.username },
        { phone: validatedData.phone },
        ...(body.googleId ? [{ googleId: body.googleId }] : [])
      ]
    });

    if (existingUser) {
      // ✅ SPECIAL HANDLING: Update temp Google users
      if (body.authMethod === 'google' && 
          existingUser.googleId === body.googleId && 
          existingUser.username.startsWith('temp_')) {
        
        console.log('🔄 Updating temporary Google user with validated data');
        
        const updatedUser = await User.findByIdAndUpdate(existingUser._id, {
          name: validatedData.name,
          username: validatedData.username,
          phone: validatedData.phone,
          role: validatedData.role,
          location: validatedData.location,
          skills: validatedData.skills || [],
          availableNow: validatedData.role === 'fixer',
          // Remove temp status
          $unset: { 
            temporaryUser: 1 
          }
        }, { new: true });

        // Add welcome notification
        await updatedUser.addNotification(
          'welcome',
          'Welcome to Fixly!',
          `Welcome ${validatedData.name}! Your account setup is complete.`
        );

        return NextResponse.json({
          success: true,
          message: 'Account setup completed successfully',
          user: {
            id: updatedUser._id,
            name: updatedUser.name,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            isVerified: updatedUser.isVerified
          }
        });
      } else {
        // Handle duplicate user scenarios
        if (existingUser.email === validatedData.email) {
          return NextResponse.json(
            { message: 'An account with this email already exists' },
            { status: 409 }
          );
        }
        if (existingUser.username === validatedData.username) {
          return NextResponse.json(
            { message: 'This username is already taken' },
            { status: 409 }
          );
        }
        if (existingUser.phone === validatedData.phone) {
          return NextResponse.json(
            { message: 'An account with this phone number already exists' },
            { status: 409 }
          );
        }
      }
    }

    // ✅ CREATE NEW USER WITH VALIDATED DATA
    let passwordHash = null;
    if (body.password && body.authMethod === 'email') {
      passwordHash = await bcrypt.hash(body.password, 12);
    }

    const userData = {
      name: validatedData.name,
      username: validatedData.username,
      email: validatedData.email,
      phone: validatedData.phone,
      role: validatedData.role,
      location: validatedData.location,
      authMethod: body.authMethod || 'email',
      providers: [body.authMethod || 'email'],
      isVerified: body.authMethod === 'google',
      emailVerified: body.authMethod === 'google',
      phoneVerified: body.authMethod === 'phone',
      banned: false,
      isActive: true,
      availableNow: validatedData.role === 'fixer',
      plan: {
        type: 'free',
        status: 'active',
        creditsUsed: 0
      }
    };

    // Add auth-specific data
    if (passwordHash) {
      userData.passwordHash = passwordHash;
    }

    if (body.authMethod === 'google') {
      userData.googleId = body.googleId || session.user.googleId;
      userData.picture = body.picture || session.user.image;
    }

    if (body.authMethod === 'phone') {
      userData.uid = body.firebaseUid;
    }

    // Add skills for fixers
    if (validatedData.role === 'fixer' && validatedData.skills) {
      userData.skills = validatedData.skills;
    }

    console.log('👤 Creating user with validated data');

    const user = new User(userData);
    await user.save();

    // Add welcome notification
    await user.addNotification(
      'welcome',
      'Welcome to Fixly!',
      `Welcome ${validatedData.name}! Your account has been created successfully. ${
        validatedData.role === 'fixer' 
          ? 'You have 3 free job applications to get started.' 
          : 'Start posting jobs to find skilled professionals.'
      }`
    );

    console.log('✅ User created successfully:', user._id);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        authMethod: user.authMethod
      }
    }, { status: 201 });

  } catch (error) {
    console.error('💥 Signup error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken` },
        { status: 409 }
      );
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { message: 'Validation failed', errors: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}