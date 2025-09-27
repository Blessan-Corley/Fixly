// lib/auth.js - Enhanced with Redis session caching and rate limiting
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './db';
import User from '../models/User';
import { redisRateLimit, sessionRedis, redisUtils } from './redis';

// Session configuration
const sessionConfig = {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // Update session every 24 hours
};

// JWT configuration
const jwtConfig = {
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('NEXTAUTH_SECRET is required in production') })() : 'fallback-secret-key-for-development'),
  maxAge: 30 * 24 * 60 * 60, // 30 days
};

// ✅ CRITICAL FIX: Check for required environment variables
const checkEnvironmentVariables = () => {
  const missingVars = [];
  
  if (!process.env.MONGODB_URI) {
    missingVars.push('MONGODB_URI');
  }
  
  if (!process.env.NEXTAUTH_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      missingVars.push('NEXTAUTH_SECRET');
    } else {
      console.warn('⚠️ NEXTAUTH_SECRET not set, using fallback for development');
    }
  }
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️ Google OAuth credentials not set, Google login will be disabled');
    console.warn('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
    console.warn('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
  } else {
    console.log('✅ Google OAuth credentials are configured');
  }
  
  // Fix port mismatch issue
  if (!process.env.NEXTAUTH_URL) {
    console.warn('⚠️ NEXTAUTH_URL not set, using fallback for development');
    // Set default URL based on current port
    const port = process.env.PORT || 3000;
    process.env.NEXTAUTH_URL = `http://localhost:${port}`;
  }
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please check your .env.local file');
  }
  
  return missingVars.length === 0;
};

// Check environment on module load
const envCheck = checkEnvironmentVariables();
if (!envCheck) {
  console.warn('⚠️ Some environment variables are missing. Authentication may not work properly.');
}

export const authOptions = {
  providers: [
    // Only add Google provider if credentials are available
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline", 
            response_type: "code",
            scope: "openid email profile"
          }
        }
      })
    ] : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        loginMethod: { label: 'Login Method', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials) return null;

        try {
          // Enhanced Redis-based rate limiting for login attempts
          const rateLimitResult = await redisRateLimit(
            `login_attempts:${credentials.email}`,
            5, // 5 attempts per email
            900 // 15 minutes
          );

          if (!rateLimitResult.success) {
            console.log('🚫 Rate limit exceeded for login attempts:', credentials.email);
            throw new Error('Too many login attempts. Please wait 15 minutes before trying again or use the "Forgot Password" option.');
          }

          await connectDB();
          
          let user;
          
          if (credentials.loginMethod === 'email') {
            // First try to find user by email only
            user = await User.findOne({ 
              email: credentials.email.toLowerCase()
            }).select('+passwordHash');
            
            if (!user) {
              console.log('❌ User not found');
              throw new Error('Invalid email or password');
            }
            
            // Check if user should use Google login
            if (user.authMethod === 'google') {
              console.log('❌ User should use Google login');
              throw new Error('Please use Google login for this account');
            }
            
            if (!user.passwordHash) {
              console.log('❌ No password set for user');
              throw new Error('Please use Google login for this account');
            }
            
            const isValidPassword = await user.comparePassword(credentials.password);
            
            if (!isValidPassword) {
              throw new Error('Invalid email or password. If you forgot your password, please use the "Forgot Password" link.');
            }

            // Check if user has completed registration
            if (!user.isRegistered && !user.role) {
              throw new Error('Please complete your registration first');
            }
          } else {
            throw new Error('Invalid login method');
          }
          
          // Check if user is banned or inactive
          if (user.banned) {
            throw new Error('Account has been suspended. Please contact support.');
          }

          if (!user.isActive || user.deletedAt) {
            throw new Error('Account is inactive. Please contact support.');
          }

          // Update last login time
          user.lastLoginAt = new Date();
          user.lastActivityAt = new Date();
          await user.save();

          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Auth successful for:', user.email);
          }
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            username: user.username,
            phone: user.phone,
            isVerified: user.isVerified,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            picture: user.picture || user.profilePhoto,
            authMethod: user.authMethod,
            isRegistered: true
          };
        } catch (error) {
          console.error('❌ Auth error:', error);
          throw error;
        }
      }
    })
  ],

  callbacks: {
    async signIn({ user, account, profile, request }) {
      console.log('🔍 SignIn callback:', {
        provider: account?.provider,
        userEmail: user?.email,
        userName: user?.name,
        requestUrl: request?.url
      });

      // ✅ FIXED GOOGLE SIGNIN LOGIC
      if (account?.provider === 'google') {
        try {
          console.log('🔄 Processing Google signin for:', user.email);

          // First, try to connect to database
          await connectDB();
          console.log('✅ Database connected for Google signin');

          let existingUser = await User.findOne({
            $or: [
              { email: user.email },
              { googleId: account.providerAccountId }
            ]
          });

          if (existingUser) {
            console.log('👤 Existing user found:', existingUser.email);

            // Check if user is banned
            if (existingUser.banned) {
              console.log('❌ Banned user attempted Google login');
              return false;
            }

            // Update Google ID if missing
            if (!existingUser.googleId) {
              await User.findByIdAndUpdate(existingUser._id, {
                googleId: account.providerAccountId,
                picture: user.image,
                profilePhoto: {
                  url: user.image,
                  source: 'google',
                  lastUpdated: new Date()
                },
                emailVerified: true,
                isVerified: true,
                authMethod: 'google',
                $addToSet: { providers: 'google' },
                lastLoginAt: new Date(),
                lastActivityAt: new Date()
              });
            } else {
              // Update profile photo and last login time
              await User.findByIdAndUpdate(existingUser._id, {
                picture: user.image,
                'profilePhoto.url': user.image,
                'profilePhoto.lastUpdated': new Date(),
                lastLoginAt: new Date(),
                lastActivityAt: new Date()
              });
            }

            // Set user properties from database
            // ✅ CRUCIAL: Ensure user.id is the MongoDB _id string for JWT callback
            user.id = existingUser._id.toString();
            user.role = existingUser.role;
            user.username = existingUser.username;
            user.phone = existingUser.phone;
            user.isVerified = existingUser.isVerified;
            user.emailVerified = existingUser.emailVerified;
            user.phoneVerified = existingUser.phoneVerified;
            user.authMethod = existingUser.authMethod;
            // Determine if registration is complete based on your logic
            user.isRegistered = !!(existingUser.role && existingUser.username);
            // If they are registered, they don't need onboarding
            user.needsOnboarding = !user.isRegistered;

            console.log('✅ Existing user signin successful');
            return true;
          } else {
            // ✅ CREATE MINIMAL USER IMMEDIATELY FOR NEW GOOGLE USERS
            console.log('🆕 Creating new Google user:', user.email);
            
            try {
              // Generate temporary username from email (max 20 chars)
              const emailPrefix = profile.email?.split('@')[0] || 'user';
              const shortPrefix = emailPrefix.substring(0, 8); // Keep first 8 chars
              const timestamp = Date.now().toString().slice(-6); // Last 6 digits
              const tempUsername = `tmp_${shortPrefix}_${timestamp}`.toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 20);

              const newUser = await User.create({
                name: profile.name || profile.email?.split('@')[0] || 'User',
                email: profile.email,
                username: tempUsername, // Temporary username, will be updated during completion
                googleId: account.providerAccountId,
                picture: profile.picture,
                profilePhoto: {
                  url: profile.picture,
                  source: 'google',
                  lastUpdated: new Date()
                },
                authMethod: 'google',
                providers: ['google'],
                isVerified: true,
                emailVerified: true,
                isRegistered: false, // Key: Mark as incomplete
                // NO DEFAULT ROLE - User must choose during signup completion
                banned: false,
                isActive: true,
                plan: {
                  type: 'free',
                  status: 'active',
                  creditsUsed: 0,
                  startDate: new Date()
                }
              });

              // ✅ CRUCIAL: Set user.id to the newly created MongoDB _id for JWT callback
              user.id = newUser._id.toString();
              user.isRegistered = false;
              user.needsOnboarding = true; // They need to complete the signup form
              user.authMethod = 'google';
              user.emailVerified = true;
              user.isVerified = true;

              console.log('✅ New Google user created and setup complete');
              return true;
            } catch (createError) {
                console.error('❌ Error creating new Google user in database:', createError);

                // CRITICAL FIX: Don't allow signin if we can't create the user in database
                // This prevents the fallback Google ID issue that breaks signup completion
                console.error('🚫 Database user creation failed. Blocking Google signin to prevent broken state.');
                console.error('User will need to try signing up again when database is available.');

                // Return false to block the signin completely
                // NextAuth will redirect to error page
                return '/auth/error?error=DatabaseError';
            }
          }
        } catch (error) {
          console.error('❌ Google sign-in error:', error);
          console.error('Stack trace:', error.stack);

          // CRITICAL FIX: Block signin on database connection errors
          // This prevents users from getting into broken authentication states
          console.error('🚫 Database connection failed during Google signin. Blocking authentication.');
          console.error('User should try again when database connectivity is restored.');

          // Return error URL to redirect to error page with specific message
          return '/auth/error?error=DatabaseConnectionFailed';
        }
      }

      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // console.log('🔍 JWT callback:', {
      //   hasToken: !!token,
      //   hasUser: !!user,
      //   hasAccount: !!account,
      //   provider: account?.provider,
      //   trigger
      // });

      if (account?.provider === 'google') {
        token.accessToken = account.access_token;
        token.googleId = account.providerAccountId;
        // console.log('✅ Google account data added to token');
      }

      if (user) {
        // Always copy user data to token
        // ✅ user.id should now be the reliable MongoDB _id string from signIn callback
        token.id = user.id || null;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        token.role = user.role || undefined; // Never pass empty string
        token.username = user.username;
        token.phone = user.phone;
        token.isVerified = user.isVerified || false;
        token.emailVerified = user.emailVerified !== false; // Default to true unless explicitly false
        token.phoneVerified = user.phoneVerified || false;
        token.authMethod = user.authMethod || (account?.provider === 'google' ? 'google' : 'email');
        token.needsOnboarding = user.needsOnboarding || false;
        token.isRegistered = user.isRegistered || false;
        token.isNewUser = user.isNewUser || false;
        token.googleId = user.googleId || token.googleId;

        // console.log('✅ User data copied to token:', {
        //   id: token.id,
        //   email: token.email,
        //   authMethod: token.authMethod,
        //   isNewUser: token.isNewUser
        // });
      }

      // OPTIMIZED: Update token with Redis caching and session version checking
      if (trigger === 'update' && token.id && token.id.length === 24) { // Valid MongoDB ObjectId
        try {
          const cacheKey = `user_session:${token.id}`;
          let cachedData = await redisUtils.get(cacheKey);

          // Check if cache is valid with session version and age
          const cacheAge = cachedData ? Date.now() - cachedData.lastUpdated : Infinity;
          const needsFreshData = !cachedData ||
            (token.sessionVersion && cachedData.sessionVersion !== token.sessionVersion) ||
            cacheAge > 600000; // Force refresh after 10 minutes regardless

          if (needsFreshData) {
            await connectDB();
            const user = await User.findById(token.id).select(
              'role username isVerified emailVerified phoneVerified location skills subscription updatedAt'
            ).lean();

            if (user) {
              const userData = {
                id: user._id.toString(),
                role: user.role,
                username: user.username,
                isVerified: user.isVerified,
                emailVerified: user.emailVerified,
                phoneVerified: user.phoneVerified,
                location: user.location,
                skills: user.skills,
                subscription: user.subscription,
                sessionVersion: user.updatedAt?.getTime() || Date.now(),
                lastUpdated: Date.now() // Add timestamp for cache validation
              };

              // Cache for 10 minutes with session version
              await redisUtils.set(cacheKey, userData, 600);
              cachedData = userData;
            }
          }

          if (cachedData) {
            token.role = cachedData.role;
            token.username = cachedData.username;
            token.isVerified = cachedData.isVerified;
            token.emailVerified = cachedData.emailVerified;
            token.phoneVerified = cachedData.phoneVerified;
            token.location = cachedData.location;
            token.skills = cachedData.skills;
            token.subscription = cachedData.subscription;
            token.sessionVersion = cachedData.sessionVersion;
            token.isRegistered = !!(cachedData.role && cachedData.username && !cachedData.username.startsWith('tmp_'));
          }
        } catch (error) {
          console.error('❌ Error updating JWT token:', error);
          // Don't fail silently - keep existing token data
        }
      }

      return token;
    },

    async session({ session, token }) {
      // console.log('🔍 Session callback:', {
      //   hasSession: !!session,
      //   hasUser: !!session?.user,
      //   hasToken: !!token,
      //   tokenId: token?.id,
      //   tokenEmail: token?.email
      // });

      if (session.user) {
        // Set basic session data from token
        session.user.id = token.id; // This should now be the reliable MongoDB _id
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.phone = token.phone;
        session.user.isVerified = token.isVerified;
        session.user.emailVerified = token.emailVerified;
        session.user.phoneVerified = token.phoneVerified;
        session.user.authMethod = token.authMethod;
        session.user.needsOnboarding = token.needsOnboarding;
        session.user.isRegistered = token.isRegistered;
        session.user.isNewUser = token.isNewUser;
        session.user.googleId = token.googleId;

        if (token.picture || token.image) {
          session.user.image = token.picture || token.image;
        }

        // Enhanced ObjectId validation - handles MongoDB ObjectId edge cases
        const isValidObjectId = token.id &&
          typeof token.id === 'string' &&
          token.id.length === 24 &&
          /^[0-9a-fA-F]{24}$/i.test(token.id) &&
          parseInt(token.id.substring(0, 8), 16) > 0; // Ensure timestamp portion is valid

        // console.log(`🔍 Session DB Query Check: ID=${token.id}, IsValidObjectId=${isValidObjectId}`);

        // This logic might be redundant now, as the signIn callback ensures token.id is good
        // But kept for robustness.
        if (!isValidObjectId && token.id) {
          // This log should appear less frequently now
          console.log(`🔍 (Redundant Check) Skipping database query for non-ObjectId: ${token.id} (Google user - this should be rare now)`);
        }

        if (isValidObjectId && !session.user.role) {
          try {
            const cacheKey = `user_data:${token.id}`;
            let user = await redisUtils.get(cacheKey);

            if (!user) {
              await connectDB();
              user = await User.findById(token.id);
              if (user) {
                const cachedUser = {
                  id: user._id,
                  role: user.role,
                  emailVerified: user.emailVerified,
                  phoneVerified: user.phoneVerified,
                  isVerified: user.isVerified
                };
                await redisUtils.set(cacheKey, cachedUser, 600);
                user = cachedUser;
              }
            }

            if (user && user.role) {
              session.user.role = user.role;
              session.user.emailVerified = user.emailVerified;
              session.user.phoneVerified = user.phoneVerified;
              session.user.isVerified = user.isVerified;
              session.user.isRegistered = true; // If role exists in DB, it's registered
            }
          } catch (error) {
            console.error('Error fetching user data in session callback:', error);
          }
        }

        // console.log('📋 Session created:', {
        //   id: session.user.id || 'no-id',
        //   email: session.user.email,
        //   role: session.user.role,
        //   authMethod: session.user.authMethod,
        //   isRegistered: session.user.isRegistered,
        //   needsOnboarding: session.user.needsOnboarding,
        //   isNewUser: session.user.isNewUser
        // });
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // console.log('🔄 NextAuth redirect:', { url, baseUrl });

      // Always allow auth page redirects
      if (url.includes('/auth/')) {
        // console.log('✅ Allowing auth page redirect:', url);
        return url;
      }

      // If URL is relative, prepend baseUrl
      if (url.startsWith('/')) {
        const fullUrl = `${baseUrl}${url}`;
        // console.log('✅ Relative URL redirect:', fullUrl);
        return fullUrl;
      }

      // If URL contains the baseUrl, return it
      if (url.startsWith(baseUrl)) {
        // console.log('✅ Same domain redirect:', url);
        return url;
      }

      // Default safe redirect to signup for Google OAuth
      const defaultUrl = `${baseUrl}/auth/signup?method=google`;
      // console.log('✅ Default redirect:', defaultUrl);
      return defaultUrl;
    }
  },

  session: sessionConfig,
  jwt: jwtConfig,

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎉 Sign-in event:', {
          userEmail: user.email,
          provider: account?.provider,
          isNewUser,
          needsOnboarding: user.needsOnboarding,
          isRegistered: user.isRegistered,
          userId: user.id, // Should be MongoDB _id now
          userRole: user.role
        });
      }
    },
    async signOut({ session }) {
      // User logged out
    },
    async createUser({ user }) {
      // User account created
    },
    async updateUser({ user }) {
      // User account updated
    },
    async linkAccount({ user, account }) {
      // Account linked to user
    },
    async session({ session, token }) {
      // Reduce session event logging
      // console.log('📋 Session event:', session.user?.email);
    }
  },

  // Pages configuration to control redirects
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin',
    error: '/auth/error',
    // ✅ CRUCIAL: Redirect new users (including Google) to your signup page
    newUser: '/auth/signup' 
  },

  debug: false, // Disable debug logging to reduce console noise
  logger: {
    error: () => {},
    warn: () => {},
    debug: () => {}
  },

  // Security settings
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('NEXTAUTH_SECRET is required in production') })() : 'fallback-secret-key-for-development'),
  
  // Cookie settings - Enhanced for session persistence
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      }
    }
  }
};