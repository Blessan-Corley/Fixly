// lib/auth.js - Enhanced with proper session management, OAuth improvements, and rate limiting
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './db';
import User from '../models/User';
import { rateLimit } from '../utils/rateLimiting';

// Enhanced session configuration with security improvements
const sessionConfig = {
  strategy: 'jwt',
  maxAge: 7 * 24 * 60 * 60, // Reduced to 7 days for better security
  updateAge: 12 * 60 * 60, // Update session every 12 hours for security
};

// Enhanced JWT configuration with rotation
const jwtConfig = {
  secret: (() => {
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error('NEXTAUTH_SECRET environment variable is required');
    }
    return process.env.NEXTAUTH_SECRET;
  })(),
  maxAge: 7 * 24 * 60 * 60, // Reduced to 7 days
  encryption: true, // Enable JWT encryption
  signingKey: process.env.NEXTAUTH_SECRET,
  encryptionKey: process.env.NEXTAUTH_SECRET,
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
    async signIn({ user, account, profile, trigger, url }) {
      if (account?.provider === 'google') {
        try {
          await connectDB();
          
          const emailToSearch = user.email.toLowerCase();
          
          // Check if user already exists (COMPLETE profile)
          const existingUser = await User.findOne({
            $or: [
              { email: emailToSearch },
              { googleId: account.providerAccountId }
            ]
          });
          
          if (existingUser) {
            // Check if user is banned
            if (existingUser.banned) {
              console.log('❌ Banned user attempted login:', emailToSearch);
              return false;
            }
            
            // ✅ EXISTING USER - Check if profile is COMPLETE
            const isCompleteProfile = !!(
              existingUser.role && 
              existingUser.username && 
              existingUser.location &&
              existingUser.location.city &&
              !existingUser.username.startsWith('temp_')
            );
            
            if (isCompleteProfile) {
              // ✅ COMPLETE USER - Allow signin
              await User.findByIdAndUpdate(existingUser._id, {
                googleId: account.providerAccountId,
                lastLoginAt: new Date(),
                lastActivityAt: new Date()
              });
              
              user.id = existingUser._id.toString();
              user.role = existingUser.role;
              user.username = existingUser.username;
              user.phone = existingUser.phone;
              user.isVerified = true;
              user.emailVerified = true;
              user.isRegistered = true;
              user.needsOnboarding = false;
              
              console.log('✅ Complete user signed in:', emailToSearch);
              return true;
              
            } else {
              // 🔄 INCOMPLETE USER - Allow to continue signup flow
              console.log('🔄 Incomplete user continuing signup flow:', emailToSearch);
              
              // Update user with fresh Google data and allow continuation
              await User.findByIdAndUpdate(existingUser._id, {
                googleId: account.providerAccountId,
                picture: user.image,
                lastLoginAt: new Date(),
                lastActivityAt: new Date()
              });
              
              user.id = existingUser._id.toString();
              user.role = existingUser.role; // May be undefined for incomplete profiles
              user.username = existingUser.username;
              user.phone = existingUser.phone;
              user.isVerified = true;
              user.emailVerified = true;
              user.isRegistered = false; // Still needs completion
              user.needsOnboarding = true;
              
              console.log('✅ Incomplete user allowed to continue:', emailToSearch);
              return true;
            }
            
          } else {
            // 🔄 NEW USER - Create temporary user for signup flow
            console.log('🔄 Creating new Google user for signup flow:', emailToSearch);
            
            // Create minimal temporary user record for profile completion
            const tempUsername = `temp_${emailToSearch.split('@')[0]}_${Date.now()}`;
            
            const newUser = new User({
              name: user.name,
              email: emailToSearch,
              googleId: account.providerAccountId,
              username: tempUsername,
              picture: user.image,
              isVerified: true,
              emailVerified: true,
              authMethod: 'google',
              isRegistered: false, // Will be set to true after profile completion
              createdAt: new Date(),
              lastLoginAt: new Date(),
              lastActivityAt: new Date()
            });
            
            const savedUser = await newUser.save();
            
            user.id = savedUser._id.toString();
            user.isRegistered = false; // Profile not complete
            user.needsOnboarding = true;
            user.authMethod = 'google';
            
            console.log('🔄 Temporary Google user created:', emailToSearch);
            return true;
          }
          
        } catch (error) {
          console.error('❌ Google signin error:', error.message);
          throw error;
        }
      }
      
      // Regular credentials signin
      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      // On signin, save user info to token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.phone = user.phone;
        token.isVerified = user.isVerified;
        token.emailVerified = user.emailVerified;
        token.phoneVerified = user.phoneVerified;
        token.authMethod = user.authMethod;
        token.isRegistered = user.isRegistered;
        token.needsOnboarding = user.needsOnboarding;
      }
      
      // Handle session updates (when update() is called)
      if (trigger === 'update' && session) {
        console.log('🔄 JWT update triggered with session data:', session);
        // Update token with new session data
        if (session.isRegistered !== undefined) {
          token.isRegistered = session.isRegistered;
        }
        if (session.role) {
          token.role = session.role;
        }
        if (session.username) {
          token.username = session.username;
        }
      }
      
      // On subsequent requests, refresh user data from database if needed
      if (trigger === 'update' && token.id && !session) {
        try {
          await connectDB();
          const dbUser = await User.findById(token.id);
          if (dbUser) {
            token.role = dbUser.role;
            token.username = dbUser.username;
            token.phone = dbUser.phone;
            token.isRegistered = !!(
              dbUser.role && 
              dbUser.username && 
              dbUser.location &&
              dbUser.location.city &&
              !dbUser.username.startsWith('temp_')
            );
            console.log('🔄 JWT refreshed from database:', {
              isRegistered: token.isRegistered,
              role: token.role,
              username: token.username
            });
          }
        } catch (error) {
          console.error('JWT refresh error:', error);
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
        session.user.isRegistered = token.isRegistered;
        
        if (token.picture) {
          session.user.image = token.picture;
        }

        // Only log session creation once (not on every request)
        if (process.env.NODE_ENV === 'development' && !session.user.logged) {
          console.log('📋 Session created:', {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
            isRegistered: session.user.isRegistered
          });
          session.user.logged = true;
        }
      }
      
      return session;
    },

    async redirect({ url, baseUrl, token }) {
      // ✅ SMART REDIRECT: No loops, direct users to the right place
      
      // If redirecting after signout, go to home
      if (url.includes('/auth/signout') || url.includes('signout')) {
        return baseUrl;
      }
      
      // If redirecting after signin error, go to signin
      if (url.includes('/auth/error') || url.includes('error')) {
        return `${baseUrl}/auth/signin`;
      }
      
      // For successful signin/signup, redirect to dashboard
      // Dashboard will handle incomplete profiles properly
      if (url.includes('/auth/') || url === baseUrl || url.includes('callback')) {
        return `${baseUrl}/dashboard`;
      }
      
      // For all other cases, use the requested URL if it's internal
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // Default to dashboard
      return `${baseUrl}/dashboard`;
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
    error: (error) => console.error('NextAuth Error:', error),
    warn: () => {}, // Suppress warnings
    debug: () => {} // Suppress debug logs
  },

  // Security settings
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('NEXTAUTH_SECRET is required in production') })() : 'fallback-secret-key-for-development'),
  
  // Enhanced cookie settings for security
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'strict', // Enhanced to strict for better security
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true // Added httpOnly for security
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 900 // 15 minutes
      }
    }
  }
};