// app/api/auth/signup/route.js - ENHANCED WITH VALIDATION
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { redisRateLimit, redisUtils } from '../../../../lib/redis';
import { validateSignupForm, detectFakeAccount, ValidationRules } from '../../../../utils/validation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { sendWelcomeEmail } from '../../../../lib/email';

// Device detection helper function
function detectDevice(userAgent) {
  if (!userAgent) return { type: 'unknown', os: 'unknown', browser: 'unknown' };

  const ua = userAgent.toLowerCase();

  // Mobile detection
  const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|tablet/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;

  // OS detection
  let os = 'unknown';
  if (/windows nt 10.0/.test(ua)) os = 'Windows 10';
  else if (/windows nt/.test(ua)) os = 'Windows';
  else if (/mac os x/.test(ua)) os = 'macOS';
  else if (/android/.test(ua)) os = 'Android';
  else if (/iphone os/.test(ua)) os = 'iOS';
  else if (/linux/.test(ua)) os = 'Linux';

  // Browser detection
  let browser = 'unknown';
  if (/chrome/.test(ua) && !/edge/.test(ua)) browser = 'Chrome';
  else if (/safari/.test(ua) && !/chrome/.test(ua)) browser = 'Safari';
  else if (/firefox/.test(ua)) browser = 'Firefox';
  else if (/edge/.test(ua)) browser = 'Edge';
  else if (/opera/.test(ua)) browser = 'Opera';

  return {
    type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    os,
    browser,
    userAgent
  };
}

export async function POST(request) {
  try {
    // Get client IP and user agent for analytics and device detection
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    const deviceInfo = detectDevice(userAgent);

    // OPTIMIZED: Redis-based rate limiting with development bypass
    const developmentIPs = ['127.0.0.1', '::1', 'localhost', 'unknown'];
    const isLocalIP = developmentIPs.includes(ip) || process.env.NODE_ENV === 'development';

    let rateLimitResult;
    if (!isLocalIP) {
      // Production: Strict rate limiting - 3 signups per hour per IP
      rateLimitResult = await redisRateLimit(`signup:${ip}`, 3, 3600);
      if (!rateLimitResult.success) {
        const resetTime = new Date(rateLimitResult.resetTime || Date.now() + 3600000);
        return NextResponse.json(
          {
            success: false,
            message: 'Too many registration attempts. Please try again later.',
            resetTime: resetTime.toISOString(),
            remaining: rateLimitResult.remaining
          },
          { status: 429 }
        );
      }
    } else {
      // Development: Relaxed rate limiting - 10 signups per hour per IP
      rateLimitResult = await redisRateLimit(`signup_dev:${ip}`, 10, 3600);
      if (!rateLimitResult.success) {
        console.log('⚠️ Development rate limit exceeded for IP:', ip);
      } else {
        console.log('🔓 Development rate limiting applied (relaxed) for IP:', ip);
      }
    }

    const body = await request.json();
    console.log('📝 Signup request received:', {
      authMethod: body.authMethod,
      email: body.email,
      role: body.role,
      hasLocation: !!body.location,
      hasSkills: !!body.skills,
      isGoogleCompletion: body.isGoogleCompletion,
      timestamp: new Date().toISOString()
    });

    // Get current session for Google auth verification
    const session = await getServerSession(authOptions);
    console.log('🔍 Session info:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      googleId: session?.user?.googleId,
      name: session?.user?.name
    });

    // ✅ GOOGLE COMPLETION FLOW - Handle Google users completing their profile
    if (body.isGoogleCompletion === true) {
      console.log('🔄 Processing Google completion request');

      if (!session?.user?.email) {
        return NextResponse.json(
          { message: 'Authentication required for Google completion' },
          { status: 401 }
        );
      }

      // OPTIMIZED: Use existing validation utilities
      const googleValidation = validateSignupForm({
        ...body,
        authMethod: 'google',
        email: session.user.email,
        name: session.user.name
      });

      if (!googleValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            message: 'Validation failed',
            errors: googleValidation.errors
          },
          { status: 400 }
        );
      }

      // Additional Google-specific validation
      if (!body.role || !['hirer', 'fixer'].includes(body.role)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Please select your role (Hirer or Fixer)',
            errors: [{ field: 'role', error: 'Valid role is required' }]
          },
          { status: 400 }
        );
      }

      await connectDB();
      console.log('✅ MongoDB connected successfully');

      // Handle Google users - find existing or create new
      let user;
      console.log('🔍 Looking for user with session:', {
        userId: session.user.id,
        userEmail: session.user.email,
        isValidObjectId: /^[0-9a-fA-F]{24}$/.test(session.user.id)
      });

      if (session.user.id) {
        // For Google users, the ID might not be a valid MongoDB ObjectId
        // First try to find by googleId, then by email
        try {
          // Try to find by MongoDB _id first (if it's a valid ObjectId)
          if (/^[0-9a-fA-F]{24}$/.test(session.user.id)) {
            console.log('🔍 Searching by MongoDB ObjectId');
            user = await User.findById(session.user.id);
          }
        } catch (error) {
          console.log('🔍 Session user ID is not a valid MongoDB ObjectId, searching by googleId/email');
          console.log('❌ Error details:', error.message);
        }

        // If not found by _id, try by googleId or email
        if (!user) {
          console.log('🔍 Searching by googleId or email');
          user = await User.findOne({
            $or: [
              { googleId: session.user.id },
              { email: session.user.email }
            ]
          });
          console.log('🔍 Query result:', user ? 'User found' : 'No user found');
        }
      }

      // For Google completion, create complete user record if needed
      if (!user) {
        console.log('🆕 Creating complete Google user record during signup completion');

        const userData = {
          name: body.name || session.user.name,
          email: session.user.email,
          username: body.username,
          role: body.role,
          authMethod: 'google',
          googleId: session.user.id,
          picture: session.user.image,
          profilePhoto: session.user.image ? { url: session.user.image } : undefined,
          providers: ['google'],
          isVerified: true,
          emailVerified: true,
          phoneVerified: false,
          banned: false,
          isActive: true,
          isRegistered: true,
          lastLoginAt: new Date(),
          lastActivityAt: new Date(),
          profileCompletedAt: new Date(),
          plan: {
            type: 'free',
            status: 'active',
            creditsUsed: 0,
            startDate: new Date()
          }
        };

        if (body.phone) {
          // Just store the phone as-is, let the User model handle formatting
          userData.phone = body.phone;
        }

        if (body.location) {
          userData.location = body.location;
        }

        if (body.skills && body.role === 'fixer') {
          userData.skills = body.skills;
        }

        user = new User(userData);
        await user.save();
        console.log('✅ New Google user created:', user._id);
      }

      console.log('✅ User found for Google completion:', user.email);

      // Update user with complete profile
      const updateData = {
        role: body.role,
        isRegistered: true,
        profileCompletedAt: new Date(),
        lastActivityAt: new Date()
      };

      if (body.name) {
        updateData.name = body.name;
      }
      if (body.phone) {
        // Just store the phone as-is, let the User model handle formatting
        updateData.phone = body.phone;
      }
      if (body.username) {
        updateData.username = body.username.toLowerCase().trim();
      }
      if (session.user.image && !user.profilePhoto?.url) {
        updateData.profilePhoto = { url: session.user.image };
        updateData.picture = session.user.image;
      }
      if (body.location) {
        console.log('🗺️ Processing location data:', JSON.stringify(body.location, null, 2));

        // Extract coordinates from the frontend structure
        const lat = body.location.homeAddress?.coordinates?.lat ||
                   body.location.currentLocation?.lat ||
                   body.location.coordinates?.lat ||
                   body.location.lat || 0;

        const lng = body.location.homeAddress?.coordinates?.lng ||
                   body.location.currentLocation?.lng ||
                   body.location.coordinates?.lng ||
                   body.location.lng || 0;

        // Extract address components
        const city = body.location.homeAddress?.district ||
                    body.location.components?.city ||
                    body.location.city || '';

        const state = body.location.homeAddress?.state ||
                     body.location.components?.state ||
                     body.location.state || '';

        const formattedAddress = body.location.homeAddress?.formattedAddress ||
                               body.location.formatted ||
                               body.location.address || '';

        // Enhanced location storage with proper schema mapping
        updateData.location = {
          // Top-level location fields for backwards compatibility
          city,
          state,
          lat,
          lng,

          // Home address structure
          homeAddress: {
            doorNo: body.location.homeAddress?.doorNo || '',
            street: body.location.homeAddress?.street || '',
            district: city,
            state,
            postalCode: body.location.homeAddress?.postalCode || '',
            formattedAddress,
            coordinates: {
              lat,
              lng,
              accuracy: body.location.homeAddress?.coordinates?.accuracy || null
            },
            setAt: new Date()
          },

          // Current location (same as home for new users)
          currentLocation: {
            lat,
            lng,
            accuracy: body.location.currentLocation?.accuracy || null,
            lastUpdated: new Date(),
            source: body.location.currentLocation?.source || 'manual'
          }
        };

        console.log('🗺️ Final location data:', JSON.stringify(updateData.location, null, 2));
      }
      if (body.skills && body.role === 'fixer') updateData.skills = body.skills;

      console.log('🔧 About to update user:', {
        userId: user._id,
        userIdType: typeof user._id,
        isValidObjectId: /^[0-9a-fA-F]{24}$/.test(user._id?.toString()),
        updateDataKeys: Object.keys(updateData)
      });

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        updateData,
        { new: true }
      );

      console.log('✅ Google signup completion successful');

      return NextResponse.json({
        success: true,
        message: 'Profile completed successfully',
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          skills: updatedUser.skills,
          isRegistered: true
        },
        redirect: '/dashboard'
      }, { status: 201 });
    }

    // OPTIMIZED: Use comprehensive validation utilities
    console.log('🔍 Validating email signup with existing utilities');

    // Use your existing comprehensive validation
    const emailValidation = validateSignupForm({
      ...body,
      authMethod: body.authMethod || 'email'
    });

    if (!emailValidation.valid) {
      console.log('❌ Validation failed:', emailValidation.errors);
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: emailValidation.errors
        },
        { status: 400 }
      );
    }

    // Enhanced fake account detection
    const fakeDetection = detectFakeAccount(body);
    if (fakeDetection.isSuspicious && fakeDetection.riskScore > 50) {
      console.log('🚨 Suspicious account detected:', {
        fields: fakeDetection.suspiciousFields,
        riskScore: fakeDetection.riskScore
      });

      // In production, you might want to flag for manual review instead of blocking
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          {
            success: false,
            message: 'Unable to create account. Please try again or contact support.',
            code: 'ACCOUNT_VALIDATION_FAILED'
          },
          { status: 400 }
        );
      } else {
        console.log('⚠️ Fake account detected but allowed in development');
      }
    }

    const validatedData = emailValidation.validatedData;

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

    // OPTIMIZED: Efficient duplicate check with selective caching
    const searchCriteria = [
      { email: validatedData.email.toLowerCase() }
    ];

    // Only add username check if provided (required field)
    if (validatedData.username) {
      searchCriteria.push({ username: validatedData.username.toLowerCase() });
    }

    // Only add phone check if provided (optional field)
    if (validatedData.phone) {
      const cleanPhone = validatedData.phone.replace(/[^\d]/g, '');
      searchCriteria.push(
        { phone: cleanPhone },
        { phone: `+91${cleanPhone}` },
        { phone: `91${cleanPhone}` }
      );
    }

    // Add Google ID check if applicable
    if (body.googleId) {
      searchCriteria.push({ googleId: body.googleId });
    }

    // Fast database query with minimal fields
    const existingUser = await User.findOne({
      $or: searchCriteria
    }).select('_id email username phone googleId isRegistered role authMethod').lean();

    // Cache only email uniqueness for performance (most common check)
    const emailCacheKey = `email_exists:${validatedData.email.toLowerCase()}`;
    await redisUtils.set(emailCacheKey, !!existingUser, 300); // Cache for 5 minutes

    if (existingUser) {
      // Handle existing user scenarios
      if (existingUser) {
        // Check if this is an incomplete Google user that can be updated
        if (body.authMethod === 'google' &&
            existingUser.googleId === body.googleId &&
            (!existingUser.isRegistered || !existingUser.role)) {

          console.log('🔄 Updating incomplete Google user with validated data');

          const updatedUser = await User.findByIdAndUpdate(existingUser._id, {
            name: validatedData.name,
            username: validatedData.username,
            phone: validatedData.phone,
            role: validatedData.role,
            location: validatedData.location,
            skills: validatedData.skills || [],
            availableNow: validatedData.role === 'fixer',
            isRegistered: true
          }, { new: true });

          // Add welcome notification
          await updatedUser.addNotification(
            'welcome',
            'Welcome to Fixly!',
            `Welcome ${validatedData.name}! Your account setup is complete.`
          );

          // Send welcome email for Google users
          await sendWelcomeEmail(updatedUser);

          return NextResponse.json({
            success: true,
            message: 'Account setup completed successfully',
            user: {
              id: updatedUser._id,
              name: updatedUser.name,
              username: updatedUser.username,
              email: updatedUser.email,
              role: updatedUser.role,
              isVerified: updatedUser.isVerified,
              isRegistered: true
            },
            redirect: '/dashboard'
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
    }

    // ✅ CREATE NEW USER WITH VALIDATED DATA
    // Store raw password - let the User model's pre-save middleware handle hashing
    let passwordHash = null;
    if (body.password && body.authMethod === 'email') {
      passwordHash = body.password; // Store raw password, model will hash it
    }

    // Format phone number (optional field)
    let formattedPhone = null;
    if (validatedData.phone) {
      const cleanPhone = validatedData.phone.replace(/[^\d]/g, '');
      formattedPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;
    }

    // Format location data with enhanced schema support
    // Enhanced location processing for email users (matching Google user logic)
    const location = validatedData.location ? (() => {
      console.log('🗺️ Processing email user location data:', JSON.stringify(validatedData.location, null, 2));

      // Extract coordinates from multiple possible sources
      const lat = validatedData.location.homeAddress?.coordinates?.lat ||
                 validatedData.location.currentLocation?.lat ||
                 validatedData.location.coordinates?.lat ||
                 validatedData.location.lat || 0;

      const lng = validatedData.location.homeAddress?.coordinates?.lng ||
                 validatedData.location.currentLocation?.lng ||
                 validatedData.location.coordinates?.lng ||
                 validatedData.location.lng || 0;

      // Extract address components
      const city = validatedData.location.homeAddress?.district ||
                  validatedData.location.components?.city ||
                  validatedData.location.city ||
                  validatedData.location.name || '';

      const state = validatedData.location.homeAddress?.state ||
                   validatedData.location.components?.state ||
                   validatedData.location.state || '';

      const formattedAddress = validatedData.location.homeAddress?.formattedAddress ||
                             validatedData.location.formatted ||
                             validatedData.location.address || '';

      const locationData = {
        // Top-level location fields for backwards compatibility
        city,
        state,
        lat,
        lng,

        // Home address structure
        homeAddress: {
          doorNo: validatedData.location.homeAddress?.doorNo || '',
          street: validatedData.location.homeAddress?.street || validatedData.location.components?.street || '',
          district: city,
          state,
          postalCode: validatedData.location.homeAddress?.postalCode || validatedData.location.components?.pincode || '',
          formattedAddress,
          coordinates: {
            lat,
            lng,
            accuracy: validatedData.location.homeAddress?.coordinates?.accuracy || null
          },
          setAt: new Date()
        },

        // Current location (same as home for new users)
        currentLocation: {
          lat,
          lng,
          accuracy: validatedData.location.currentLocation?.accuracy || null,
          lastUpdated: new Date(),
          source: validatedData.location.currentLocation?.source || 'manual'
        }
      };

      console.log('🗺️ Final email user location data:', JSON.stringify(locationData, null, 2));
      return locationData;
    })() : null;

    // Auto-generate username if not provided
    let username = validatedData.username;
    if (!username) {
      // Generate username from email
      const emailPrefix = validatedData.email.split('@')[0];
      let cleanPrefix = emailPrefix.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      // Truncate if too long to stay under 20 chars total
      if (cleanPrefix.length > 12) {
        cleanPrefix = cleanPrefix.substring(0, 12);
      }

      const randomSuffix = Math.floor(Math.random() * 999) + 1;

      // Avoid suspicious patterns like "test123" by modifying prefix
      if (['test', 'demo', 'temp', 'fake', 'sample'].some(word => cleanPrefix.includes(word))) {
        cleanPrefix = `u${cleanPrefix}`;  // Prefix with 'u' instead
      }

      username = `${cleanPrefix}${randomSuffix}`;
      console.log('🏷️ Auto-generated username:', username);
    }

    // Validate and format username using our validation rules
    const usernameValidation = ValidationRules.validateUsername(username);

    if (!usernameValidation.valid) {
      return NextResponse.json(
        {
          message: 'Invalid username',
          errors: [{ field: 'username', error: usernameValidation.error }],
          details: usernameValidation.error
        },
        { status: 400 }
      );
    }

    username = usernameValidation.value;

    const userData = {
      // Basic Info
      name: validatedData.name.trim(),
      username: username,
      email: validatedData.email.toLowerCase().trim(),
      role: validatedData.role,
      location: location,

      // Authentication
      authMethod: body.authMethod || 'email',
      providers: [body.authMethod || 'email'],
      isVerified: true, // Mark as verified during signup for all users
      emailVerified: true, // Email is verified during signup process
      phoneVerified: false,

      // Status
      banned: false,
      isActive: true,
      isRegistered: true, // Mark as fully registered for email users
      availableNow: validatedData.role === 'fixer',

      // Plan
      plan: {
        type: 'free',
        status: 'active',
        creditsUsed: 0,
        startDate: new Date()
      },

      // Timestamps
      lastLoginAt: new Date(),
      lastActivityAt: new Date(),
      profileCompletedAt: new Date(),

      // Device and registration metadata
      registrationMetadata: {
        deviceInfo: {
          type: deviceInfo.type || 'unknown',
          os: deviceInfo.os || '',
          browser: deviceInfo.browser || '',
          userAgent: deviceInfo.userAgent || ''
        },
        ip,
        timestamp: new Date(),
        source: 'web_signup'
      },

      // Privacy settings
      privacy: {
        profileVisibility: 'public',
        showPhone: true,
        showEmail: false,
        showLocation: true,
        showRating: true,
        allowReviews: true,
        allowMessages: true,
        dataSharingConsent: true
      },

      // Preferences
      preferences: {
        theme: 'light',
        language: 'en',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        emailNotifications: true,
        pushNotifications: true,
        jobUpdates: true,
        paymentUpdates: true
      },

      // Stats
      jobsCompleted: 0,
      totalEarnings: 0,
      rating: {
        average: 0,
        count: 0
      }
    };

    // Add auth-specific data
    if (passwordHash) {
      userData.passwordHash = passwordHash;
    }

    if (body.authMethod === 'google') {
      userData.googleId = body.googleId || session.user.googleId || session.user.id;
      userData.picture = body.picture || session.user.image;
    }

    if (body.authMethod === 'phone') {
      userData.uid = body.firebaseUid;
    }

    // Add phone if provided
    if (formattedPhone) {
      userData.phone = formattedPhone;
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

    // Send welcome email
    await sendWelcomeEmail(user);

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
        skills: user.skills,
        isVerified: user.isVerified,
        authMethod: user.authMethod,
        isRegistered: true
      },
      redirect: '/dashboard'
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