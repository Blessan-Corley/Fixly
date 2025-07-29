// lib/auth.js - Fixed version (no new files needed)
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './db';
import User from '../models/User';

// ❌ REMOVED PROBLEMATIC IMPORTS:
// import { MongoDBAdapter } from '@auth/mongodb-adapter';  
// import { clientPromise } from './mongodb';

export const authOptions = {
  // ❌ REMOVED PROBLEMATIC ADAPTER:
  // adapter: MongoDBAdapter(clientPromise),
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline", 
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        phone: { label: 'Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
        loginMethod: { label: 'Login Method', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials) return null;

        try {
          await connectDB();
          console.log('🔐 Auth attempt:', credentials.loginMethod, credentials.email || credentials.phone);
          
          let user;
          
          if (credentials.loginMethod === 'email') {
            user = await User.findOne({ 
              email: credentials.email.toLowerCase()
            }).select('+passwordHash');
            
            if (!user || !user.passwordHash) {
              console.log('❌ User not found or no password');
              return null;
            }
            
            const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
            if (!isValidPassword) {
              console.log('❌ Invalid password');
              return null;
            }
          } else if (credentials.loginMethod === 'phone') {
            const cleanPhone = credentials.phone.replace(/[^\d]/g, '');
            const formattedPhone = `+91${cleanPhone}`;
            
            user = await User.findOne({ 
              phone: formattedPhone
            });
            
            if (!user) {
              console.log('❌ User not found with phone:', formattedPhone);
              return null;
            }
          }
          
          // Check if user is banned or inactive
          if (user.banned) {
            console.log('❌ User is banned');
            return null;
          }

          if (!user.isActive || user.deletedAt) {
            console.log('❌ User account is inactive');
            return null;
          }

          console.log('✅ Auth successful for:', user.email);
          
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
          return null;
        }
      }
    })
  ],

  callbacks: {
  // lib/auth.js - REPLACE the entire signIn callback with this:

async signIn({ user, account, profile }) {
  if (account?.provider === 'google') {
    try {
      await connectDB();
      
      console.log('🔍 Google sign-in attempt:', { 
        email: user.email, 
        providerAccountId: account.providerAccountId 
      });
      
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: user.email },
          { googleId: account.providerAccountId }
        ]
      });
      
      if (existingUser) {
        console.log('✅ Existing Google user found:', existingUser.email);
        
        // Update Google ID if missing
        if (!existingUser.googleId) {
          await User.findByIdAndUpdate(existingUser._id, {
            googleId: account.providerAccountId,
            picture: user.image,
            emailVerified: true,
            isVerified: true,
            authMethod: 'google',
            $addToSet: { providers: 'google' }
          });
          console.log('✅ Updated existing user with Google ID');
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
        existingUser.location && 
        existingUser.username && 
        !existingUser.username.startsWith('temp_')
        );
        
        return true;
      } else {
        console.log('🆕 New Google user - creating temporary record');
        
        // ✅ CRITICAL: Create temporary user record for new Google users
        const tempUser = new User({
          name: user.name,
          email: user.email.toLowerCase(),
          googleId: account.providerAccountId,
          picture: user.image,
          authMethod: 'google',
          providers: ['google'],
          isVerified: true,
          emailVerified: true,
          // Temporary placeholder data (will be updated during signup)
          username: `temp_${Date.now()}`,
          phone: '+919999999999',
          role: 'fixer', // Default role, will be updated
          location: {
            city: 'Temporary',
            state: 'Temporary'
          },
          plan: {
            type: 'free',
            status: 'active',
            creditsUsed: 0
          }
        });
        
        await tempUser.save();
        console.log('✅ Temporary user created:', tempUser._id);
        
        // ✅ CRITICAL FIX: Use MongoDB _id for session
        user.id = tempUser._id.toString();
        user.needsOnboarding = true;
        user.isNewUser = true;
        user.authMethod = 'google';
        user.isRegistered = false; // Still needs to complete signup
        
        return true;
      }
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      return false;
    }
  }
  
  return true;
},
    async jwt({ token, user, account }) {
      if (account?.provider === 'google') {
        token.accessToken = account.access_token;
        token.googleId = account.providerAccountId;
        
        console.log('🎫 JWT callback for Google:', {
          email: token.email,
          googleId: token.googleId
        });
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
        
        console.log('🎫 JWT token updated:', {
          id: token.id,
          email: token.email,
          isRegistered: token.isRegistered,
          needsOnboarding: token.needsOnboarding
        });
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
    
    console.log('📋 Session created:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role, // ← This should show the correct role
      isRegistered: session.user.isRegistered
    });
  }
  
  return session;
},

    async redirect({ url, baseUrl }) {
      console.log('🔄 Redirect callback:', { url, baseUrl });
      
      // Handle post-authentication redirects
      if (url.startsWith('/')) {
        const fullUrl = `${baseUrl}${url}`;
        console.log('✅ Internal redirect to:', fullUrl);
        return fullUrl;
      }
      
      if (new URL(url).origin === baseUrl) {
        console.log('✅ Same origin redirect to:', url);
        return url;
      }
      
      // Default redirect to dashboard
      const defaultUrl = `${baseUrl}/dashboard`;
      console.log('✅ Default redirect to:', defaultUrl);
      return defaultUrl;
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin'
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      console.log('🎉 Sign-in event:', { 
        userEmail: user.email, 
        provider: account?.provider, 
        isNewUser,
        needsOnboarding: user.needsOnboarding,
        isRegistered: user.isRegistered
      });
    },
    async signOut({ session }) {
      console.log('👋 Sign-out event:', session?.user?.email);
    }
  },

  debug: process.env.NODE_ENV === 'development'
};