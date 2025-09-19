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
checkEnvironmentVariables();

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
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          await connectDB();
          const existingUser = await User.findOne({
            $or: [
              { email: user.email },
              { googleId: account.providerAccountId }
            ]
          });
          
          if (existingUser) {
            // Check if user is banned
            if (existingUser.banned) {
              if (process.env.NODE_ENV === 'development') {
                console.log('❌ Banned user attempted Google login');
              }
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
            
            // ✅ CRITICAL FIX: Use MongoDB _id, not Google ID
            user.id = existingUser._id.toString();
            user.role = existingUser.role;
            user.username = existingUser.username;
            user.phone = existingUser.phone;
            user.isVerified = existingUser.isVerified;
            user.emailVerified = existingUser.emailVerified;
            user.phoneVerified = existingUser.phoneVerified;
            user.authMethod = existingUser.authMethod;
            user.isRegistered = !!(
              existingUser.role && 
              existingUser.username && 
              !existingUser.username.startsWith('temp_')
            );
            
            
            return true;
          } else {
            // ❌ REJECT NEW USERS: Google login should only work for existing users
            console.log('🚫 Google login attempted by new user:', user.email);
            console.log('💡 User needs to create an account first through proper signup');

            // Create a custom error with user information
            const error = new Error('AccountNotFound');
            error.email = user.email;
            error.name = user.name;
            throw error;
          }
        } catch (error) {
          console.error('Google sign-in error:', error);

          // Handle AccountNotFound error specially
          if (error.message === 'AccountNotFound') {
            console.log('🚨 Redirecting user to custom error page with account info');
            // This will trigger NextAuth to redirect to error page with these params
            const customError = new Error(`AccountNotFound&email=${encodeURIComponent(error.email || user?.email || '')}&name=${encodeURIComponent(error.name || user?.name || '')}`);
            throw customError;
          }

          // If it's a database connection error, we should still allow the user to proceed
          // but mark them as needing to complete setup
          if (error.message.includes('Database connection failed') || 
              error.message.includes('Cannot access') ||
              error.message.includes('MONGODB_URI') ||
              error.name === 'MongoNetworkError' ||
              error.name === 'MongooseServerSelectionError') {
            
            // Create a temporary user object for the session
            user.id = `temp_${Date.now()}`;
            user.role = null; // Don't set a default role, let signup page handle it
            user.username = `temp_${Date.now()}`;
            user.phone = '+919999999999';
            user.isVerified = false;
            user.emailVerified = true; // Google users have verified email
            user.phoneVerified = false;
            user.authMethod = 'google';
            user.isRegistered = false;
            user.needsOnboarding = true;
            user.isNewUser = true;
            
            console.log('⚠️ Created temporary session:', {
              id: user.id,
              email: user.email,
              role: user.role
            });
            
            return true; // Allow the user to proceed
          }
          
          return false;
        }
      }
      
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      if (account?.provider === 'google') {
        token.accessToken = account.access_token;
        token.googleId = account.providerAccountId;
        
      }
      
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.phone = user.phone;
        token.isVerified = user.isVerified;
        token.emailVerified = user.emailVerified;
        token.phoneVerified = user.phoneVerified;
        token.authMethod = user.authMethod || (account?.provider === 'google' ? 'google' : 'email');
        token.needsOnboarding = user.needsOnboarding;
        token.isRegistered = user.isRegistered;
        token.isNewUser = user.isNewUser;
        token.picture = user.image || user.picture;
        
      }

      // Update token on session update with Redis caching
      if (trigger === 'update') {
        try {
          const cacheKey = `user_data:${token.id}`;
          let user = await redisUtils.get(cacheKey);

          if (!user) {
            await connectDB();
            user = await User.findById(token.id);
            if (user) {
              // Cache user data for 10 minutes for faster subsequent requests
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
            token.isRegistered = !!(
              user.role &&
              user.location &&
              user.username &&
              !user.username.startsWith('temp_')
            );
          }
        } catch (error) {
          console.error('Error updating JWT token:', error);
        }
      }
      
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
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
        
        if (token.picture) {
          session.user.image = token.picture;
        }

        // ✅ ENHANCED: Ensure role is always set with Redis caching
        if (!session.user.role || !session.user.hasOwnProperty('emailVerified')) {
          try {
            const cacheKey = `user_data:${token.id}`;
            let user = await redisUtils.get(cacheKey);

            if (!user) {
              await connectDB();
              user = await User.findById(token.id);
              if (user) {
                // Cache user data for faster subsequent requests
                const cachedUser = {
                  id: user._id,
                  role: user.role,
                  emailVerified: user.emailVerified,
                  phoneVerified: user.phoneVerified,
                  isVerified: user.isVerified
                };
                await redisUtils.set(cacheKey, cachedUser, 600); // 10 minutes
                user = cachedUser;
              }
            }

            if (user) {
              if (user.role) {
                session.user.role = user.role;
                token.role = user.role;
              }
              // Always update verification status
              session.user.emailVerified = user.emailVerified;
              session.user.phoneVerified = user.phoneVerified;
              session.user.isVerified = user.isVerified;
              token.emailVerified = user.emailVerified;
              token.phoneVerified = user.phoneVerified;
              token.isVerified = user.isVerified;
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 Session created:', {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
            isRegistered: session.user.isRegistered
          });
        }
      }
      
      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log('🔄 NextAuth redirect:', { url, baseUrl });

      // Handle specific redirect cases
      if (url.includes('/auth/signin') || url.includes('/auth/signup')) {
        return url;
      }

      // Handle AccountNotFound error - redirect with user info
      if (url.includes('/auth/error?error=AccountNotFound')) {
        return url; // Keep the original URL with query params
      }

      // If URL is relative, prepend baseUrl
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      // If URL contains the baseUrl, return it
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Default to dashboard
      return `${baseUrl}/dashboard`;
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
  
  // Cookie settings
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
};