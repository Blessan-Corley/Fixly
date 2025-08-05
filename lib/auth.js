// lib/auth.js - Enhanced with proper session management, OAuth improvements, and rate limiting
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './db';
import User from '../models/User';
import { rateLimit } from '../utils/rateLimiting';

// Session configuration
const sessionConfig = {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // Update session every 24 hours
};

// JWT configuration
const jwtConfig = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development',
  maxAge: 30 * 24 * 60 * 60, // 30 days
};

// ✅ CRITICAL FIX: Check for required environment variables
const checkEnvironmentVariables = () => {
  const missingVars = [];
  
  if (!process.env.MONGODB_URI) {
    missingVars.push('MONGODB_URI');
  }
  
  if (!process.env.NEXTAUTH_SECRET) {
    console.warn('⚠️ NEXTAUTH_SECRET not set, using fallback for development');
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
          // Apply rate limiting for login attempts
          const rateLimitResult = await rateLimit(
            { headers: new Map([['x-forwarded-for', '127.0.0.1']]) },
            'login_attempts',
            5, // 5 attempts
            15 * 60 * 1000 // 15 minutes
          );

          if (!rateLimitResult.success) {
            console.log('🚫 Rate limit exceeded for login attempts');
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
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 Password check:', {
                provided: credentials.password.length,
                hashLength: user.passwordHash.length,
                hash: user.passwordHash.slice(0, 15),
                match: isValidPassword
              });
            }
            
            // Additional debug for failed logins in development only
            if (!isValidPassword) {
              if (process.env.NODE_ENV === 'development') {
                console.log('🔍 Password mismatch debug:', {
                  email: credentials.email,
                  authMethod: user.authMethod,
                  hasPasswordHash: !!user.passwordHash,
                  passwordHashStart: user.passwordHash.slice(0, 20)
                });
                console.log('❌ Invalid password');
              }
              throw new Error('Invalid email or password. If you forgot your password, please use the "Forgot Password" link.');
            }

            // Check if user has completed registration
            if (!user.isRegistered && !user.role) {
              console.log('❌ User registration not complete');
              throw new Error('Please complete your registration first');
            }
          } else {
            throw new Error('Invalid login method');
          }
          
          // Check if user is banned or inactive
          if (user.banned) {
            console.log('❌ User is banned');
            throw new Error('Account has been suspended. Please contact support.');
          }

          if (!user.isActive || user.deletedAt) {
            console.log('❌ User account is inactive');
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
              if (process.env.NODE_ENV === 'development') {
                console.log('🔄 Updating existing user with Google ID...');
              }
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
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Updated existing user with Google ID');
              }
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
            user.authMethod = existingUser.authMethod;
            user.isRegistered = !!(
              existingUser.role && 
              existingUser.username && 
              !existingUser.username.startsWith('temp_')
            );
            
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ User session data set:', {
                id: user.id,
                email: user.email,
                role: user.role,
                isRegistered: user.isRegistered
              });
            }
            
            return true;
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('🆕 New Google user - creating user record');
            }
            
            // Create a proper user record for Google sign-in
            // Generate a shorter unique username (max 20 chars)
            const shortId = Math.random().toString(36).slice(2, 7);
            const baseUsername = user.email.split('@')[0].toLowerCase()
              .replace(/[^a-z0-9]/g, '') // Remove any non-alphanumeric characters including dots
              .slice(0, 10);
            const username = `${baseUsername}_${shortId}`;

            const newUser = new User({
              name: user.name,
              email: user.email.toLowerCase(),
              googleId: account.providerAccountId,
              picture: null,
              authMethod: 'google',
              providers: ['google'],
              isVerified: true,
              emailVerified: true,
              username: username,
              role: null, // Will be set during signup completion
              phone: null,
              isRegistered: false, // Mark as not registered
              location: {
                city: '',
                state: '',
                lat: 0,
                lng: 0
              },
              // Default plan
              plan: {
                type: 'free',
                status: 'active',
                creditsUsed: 0,
                startDate: new Date()
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
              },
              // Timestamps
              lastLoginAt: new Date(),
              lastActivityAt: new Date(),
              createdAt: new Date()
            });
            
            if (process.env.NODE_ENV === 'development') {
              console.log('🔄 Saving new user to database...');
            }
            await newUser.save();
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ New user created:', newUser._id);
            }
            
            // ✅ CRITICAL FIX: Use MongoDB _id for session
            user.id = newUser._id.toString();
            user.needsOnboarding = true;
            user.isNewUser = true;
            user.authMethod = 'google';
            user.isRegistered = false; // Still needs to complete signup
            user.role = null; // Force null to trigger signup completion
            user.username = newUser.username;
            user.phone = newUser.phone;
            user.isVerified = newUser.isVerified;
            
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ New user session data set:', {
                id: user.id,
                email: user.email,
                role: user.role,
                isRegistered: user.isRegistered
              });
            }
            
            return true;
          }
        } catch (error) {
          console.error('❌ Google sign-in error:', error);
          console.error('❌ Error stack:', error.stack);
          console.error('❌ Error name:', error.name);
          console.error('❌ Error message:', error.message);
          
          // If it's a database connection error, we should still allow the user to proceed
          // but mark them as needing to complete setup
          if (error.message.includes('Database connection failed') || 
              error.message.includes('Cannot access') ||
              error.message.includes('MONGODB_URI') ||
              error.name === 'MongoNetworkError' ||
              error.name === 'MongooseServerSelectionError') {
            console.log('⚠️ Database connection failed, but allowing user to proceed with temporary session');
            
            // Create a temporary user object for the session
            user.id = `temp_${Date.now()}`;
            user.role = 'fixer';
            user.username = `temp_${Date.now()}`;
            user.phone = '+919999999999';
            user.isVerified = false;
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
          
          console.error('❌ Returning false due to error');
          return false;
        }
      }
      
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      if (account?.provider === 'google') {
        token.accessToken = account.access_token;
        token.googleId = account.providerAccountId;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🎫 JWT callback for Google:', {
            email: token.email,
            googleId: token.googleId
          });
        }
      }
      
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.phone = user.phone;
        token.isVerified = user.isVerified;
        token.authMethod = user.authMethod || (account?.provider === 'google' ? 'google' : 'email');
        token.needsOnboarding = user.needsOnboarding;
        token.isRegistered = user.isRegistered;
        token.isNewUser = user.isNewUser;
        token.picture = user.image || user.picture;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🎫 JWT token updated:', {
            id: token.id,
            email: token.email,
            isRegistered: token.isRegistered,
            needsOnboarding: token.needsOnboarding
          });
        }
      }

      // Update token on session update
      if (trigger === 'update') {
        try {
          await connectDB();
          const user = await User.findById(token.id);
          if (user) {
            token.role = user.role;
            token.username = user.username;
            token.isVerified = user.isVerified;
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
        session.user.authMethod = token.authMethod;
        session.user.needsOnboarding = token.needsOnboarding;
        session.user.isRegistered = token.isRegistered;
        session.user.isNewUser = token.isNewUser;
        session.user.googleId = token.googleId;
        
        if (token.picture) {
          session.user.image = token.picture;
        }

        // ✅ CRITICAL FIX: Ensure role is always set
        if (!session.user.role) {
          try {
            await connectDB();
            const user = await User.findById(token.id);
            if (user && user.role) {
              session.user.role = user.role;
              // Update token too for next time
              token.role = user.role;
            }
          } catch (error) {
            console.error('Error fetching user role:', error);
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
      
      // Default redirect to dashboard - let the dashboard handle user state
      return `${baseUrl}/dashboard`;
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
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
      if (process.env.NODE_ENV === 'development') {
        console.log('👋 Sign-out event:', session?.user?.email);
      }
    },
    async createUser({ user }) {
      console.log('👤 User created:', user.email);
    },
    async updateUser({ user }) {
      console.log('📝 User updated:', user.email);
    },
    async linkAccount({ user, account }) {
      console.log('🔗 Account linked:', user.email, account.provider);
    },
    async session({ session, token }) {
      // Reduce session event logging
      // console.log('📋 Session event:', session.user?.email);
    }
  },

  debug: false, // Disable debug logging to reduce console noise
  logger: {
    error: () => {},
    warn: () => {},
    debug: () => {}
  },

  // Security settings
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development',
  
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