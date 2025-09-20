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

      if (account?.provider === 'google') {
        try {
          console.log('🔄 Processing Google signin for:', user.email);

          // First, try to connect to database
          await connectDB();
          console.log('✅ Database connected for Google signin');

          const existingUser = await User.findOne({
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
                emailVerified: true,
                isVerified: true,
                authMethod: 'google',
                $addToSet: { providers: 'google' },
                lastLoginAt: new Date(),
                lastActivityAt: new Date()
              });
            } else {
              // Update last login time
              await User.findByIdAndUpdate(existingUser._id, {
                lastLoginAt: new Date(),
                lastActivityAt: new Date()
              });
            }

            // Set user properties from database
            user.id = existingUser._id.toString();
            user.role = existingUser.role;
            user.username = existingUser.username;
            user.phone = existingUser.phone;
            user.isVerified = existingUser.isVerified;
            user.emailVerified = existingUser.emailVerified;
            user.phoneVerified = existingUser.phoneVerified;
            user.authMethod = existingUser.authMethod;
            user.isRegistered = !!(existingUser.role && existingUser.username);

            console.log('✅ Existing user signin successful');
            return true;
          } else {
            // New Google user - check if this is signin or signup context
            const isSignupContext = request?.url?.includes('/auth/signup') ||
                                   request?.url?.includes('signup') ||
                                   account?.callbackUrl?.includes('signup');

            if (!isSignupContext) {
              // User trying to login with non-existing account
              console.log('❌ Google login attempted with non-existing account:', user.email);
              throw new Error(`AccountNotFound&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}`);
            }

            // New Google user in signup context - allow
            console.log('🆕 New Google user signup:', user.email);

            // Store Google account data in user object for signup completion
            user.googleId = account.providerAccountId;
            user.role = null;
            user.username = null;
            user.phone = null;
            user.isVerified = false;
            user.emailVerified = true;
            user.phoneVerified = false;
            user.authMethod = 'google';
            user.isRegistered = false;
            user.needsOnboarding = true;
            user.isNewUser = true;

            console.log('✅ New Google user signup setup complete');
            return true;
          }
        } catch (error) {
          console.error('❌ Google sign-in error:', error);
          console.error('Stack trace:', error.stack);

          // For new users, don't block signin on database errors
          console.log('⚠️ Database error during Google signin. Proceeding with limited user data.');
          user.googleId = account.providerAccountId;
          user.authMethod = 'google';
          user.emailVerified = true;
          user.isNewUser = true;
          user.needsOnboarding = true;
          user.isRegistered = false;

          console.log('✅ Fallback Google user setup complete');
          return true;
        }
      }

      return true;
    },

    async jwt({ token, user, account, trigger }) {
      console.log('🔍 JWT callback:', {
        hasToken: !!token,
        hasUser: !!user,
        hasAccount: !!account,
        provider: account?.provider,
        trigger
      });

      if (account?.provider === 'google') {
        token.accessToken = account.access_token;
        token.googleId = account.providerAccountId;
        console.log('✅ Google account data added to token');
      }

      if (user) {
        // Always copy user data to token
        token.id = user.id || null;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        token.role = user.role;
        token.username = user.username;
        token.phone = user.phone;
        token.isVerified = user.isVerified || false;
        token.emailVerified = user.emailVerified || false;
        token.phoneVerified = user.phoneVerified || false;
        token.authMethod = user.authMethod || (account?.provider === 'google' ? 'google' : 'email');
        token.needsOnboarding = user.needsOnboarding || false;
        token.isRegistered = user.isRegistered || false;
        token.isNewUser = user.isNewUser || false;
        token.googleId = user.googleId || token.googleId;

        console.log('✅ User data copied to token:', {
          id: token.id,
          email: token.email,
          authMethod: token.authMethod,
          isNewUser: token.isNewUser
        });
      }

      // Update token on session update with Redis caching (only for users with ID)
      if (trigger === 'update' && token.id) {
        try {
          const cacheKey = `user_data:${token.id}`;
          let user = await redisUtils.get(cacheKey);

          if (!user) {
            await connectDB();
            user = await User.findById(token.id);
            if (user) {
              await redisUtils.set(cacheKey, {
                id: user._id,
                role: user.role,
                username: user.username,
                isVerified: user.isVerified,
                emailVerified: user.emailVerified,
                phoneVerified: user.phoneVerified,
                location: user.location
              }, 600);
            }
          }

          if (user) {
            token.role = user.role;
            token.username = user.username;
            token.isVerified = user.isVerified;
            token.emailVerified = user.emailVerified;
            token.phoneVerified = user.phoneVerified;
            token.isRegistered = !!(user.role && user.username);
          }
        } catch (error) {
          console.error('Error updating JWT token:', error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      console.log('🔍 Session callback:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasToken: !!token,
        tokenId: token?.id,
        tokenEmail: token?.email
      });

      if (session.user) {
        // Set basic session data from token
        session.user.id = token.id;
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

        // Only try to fetch from database if we have a valid MongoDB ObjectId
        // Google users who haven't completed signup won't have a valid ObjectId yet
        const isValidObjectId = token.id && /^[0-9a-fA-F]{24}$/.test(token.id);

        if (!isValidObjectId && token.id) {
          console.log(`🔍 Skipping database query for non-ObjectId: ${token.id} (Google user)`);
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
              session.user.isRegistered = true;
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }

        console.log('📋 Session created:', {
          id: session.user.id || 'no-id',
          email: session.user.email,
          role: session.user.role,
          authMethod: session.user.authMethod,
          isRegistered: session.user.isRegistered,
          needsOnboarding: session.user.needsOnboarding,
          isNewUser: session.user.isNewUser
        });
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log('🔄 NextAuth redirect:', { url, baseUrl });

      // Always allow auth page redirects
      if (url.includes('/auth/')) {
        console.log('✅ Allowing auth page redirect:', url);
        return url;
      }

      // If URL is relative, prepend baseUrl
      if (url.startsWith('/')) {
        const fullUrl = `${baseUrl}${url}`;
        console.log('✅ Relative URL redirect:', fullUrl);
        return fullUrl;
      }

      // If URL contains the baseUrl, return it
      if (url.startsWith(baseUrl)) {
        console.log('✅ Same domain redirect:', url);
        return url;
      }

      // Default safe redirect to signup for Google OAuth
      const defaultUrl = `${baseUrl}/auth/signup?method=google`;
      console.log('✅ Default redirect:', defaultUrl);
      return defaultUrl;
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    signUp: '/auth/signup'
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
          userId: user.id,
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
    signUp: '/auth/signup',
    error: '/auth/error'
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