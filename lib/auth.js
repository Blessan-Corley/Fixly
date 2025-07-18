// lib/auth.js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './db';
import User from '../models/User';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        phone: { label: 'Phone', type: 'text' },
        loginMethod: { label: 'Method', type: 'text' }
      },
      async authorize(credentials) {
        try {
          await connectDB();
          
          if (credentials.loginMethod === 'email') {
            const user = await User.findOne({ email: credentials.email });
            
            if (!user) {
              throw new Error('No user found with this email');
            }
            
            if (user.banned) {
              throw new Error('Account has been suspended');
            }
            
            const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
            
            if (!isValid) {
              throw new Error('Invalid password');
            }
            
            // Update last login
            user.lastLoginAt = new Date();
            await user.save();
            
            return {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              role: user.role,
              username: user.username,
              photoURL: user.photoURL,
              isVerified: user.isVerified
            };
          }
          
          if (credentials.loginMethod === 'phone') {
            // For phone login, Firebase handles verification
            // This would be called after Firebase OTP verification
            const user = await User.findOne({ phone: credentials.phone });
            
            if (!user) {
              throw new Error('No user found with this phone number');
            }
            
            if (user.banned) {
              throw new Error('Account has been suspended');
            }
            
            // Update last login
            user.lastLoginAt = new Date();
            await user.save();
            
            return {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              role: user.role,
              username: user.username,
              photoURL: user.photoURL,
              isVerified: user.isVerified
            };
          }
          
          return null;
        } catch (error) {
          console.error('Auth error:', error);
          throw new Error(error.message);
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === 'google') {
        try {
          await connectDB();
          
          let existingUser = await User.findOne({ email: user.email });
          
          if (existingUser) {
            if (existingUser.banned) {
              return false;
            }
            
            // Update Google info if signing in with Google
            if (!existingUser.uid && account.providerAccountId) {
              existingUser.uid = account.providerAccountId;
              existingUser.photoURL = user.image || existingUser.photoURL;
              existingUser.lastLoginAt = new Date();
              await existingUser.save();
            }
            
            return true;
          }
          
          // New Google user - redirect to complete profile
          return `/auth/onboarding?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name)}&photo=${encodeURIComponent(user.image || '')}`;
          
        } catch (error) {
          console.error('Google signIn error:', error);
          return false;
        }
      }
      
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.username = user.username;
        token.isVerified = user.isVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.isVerified = token.isVerified;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};