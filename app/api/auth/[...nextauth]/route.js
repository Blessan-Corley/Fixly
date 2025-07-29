// // app/api/auth/[...nextauth]/route.js
// import NextAuth from 'next-auth';
// import GoogleProvider from 'next-auth/providers/google';
// import CredentialsProvider from 'next-auth/providers/credentials';
// import bcrypt from 'bcryptjs';
// import connectDB from '@/lib/db';
// import User from '@/models/User';

// export const authOptions = {
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       authorization: {
//         params: {
//           prompt: "consent",
//           access_type: "offline",
//           response_type: "code"
//         }
//       }
//     }),
//     CredentialsProvider({
//       name: 'credentials',
//       credentials: {
//         email: { label: 'Email', type: 'email' },
//         phone: { label: 'Phone', type: 'text' },
//         password: { label: 'Password', type: 'password' },
//         loginMethod: { label: 'Login Method', type: 'text' }
//       },
//       async authorize(credentials) {
//         if (!credentials) return null;

//         try {
//           await connectDB();
//           console.log('🔐 Auth attempt:', credentials.loginMethod, credentials.email || credentials.phone);
          
//           let user;
          
//           if (credentials.loginMethod === 'email') {
//             user = await User.findOne({ 
//               email: credentials.email.toLowerCase()
//             }).select('+passwordHash');
            
//             if (!user || !user.passwordHash) {
//               console.log('❌ User not found or no password');
//               return null;
//             }
            
//             const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
//             if (!isValidPassword) {
//               console.log('❌ Invalid password');
//               return null;
//             }
//           } else if (credentials.loginMethod === 'phone') {
//             const cleanPhone = credentials.phone.replace(/[^\d]/g, '');
//             const formattedPhone = `+91${cleanPhone}`;
            
//             user = await User.findOne({ 
//               phone: formattedPhone
//             });
            
//             if (!user) {
//               console.log('❌ User not found with phone:', formattedPhone);
//               return null;
//             }
//           }
          
//           // Check if user is banned or inactive
//           if (user.banned) {
//             console.log('❌ User is banned');
//             return null;
//           }

//           if (!user.isActive || user.deletedAt) {
//             console.log('❌ User account is inactive');
//             return null;
//           }

//           console.log('✅ Auth successful for:', user.email);
          
//           return {
//             id: user._id.toString(),
//             email: user.email,
//             name: user.name,
//             role: user.role,
//             username: user.username,
//             phone: user.phone,
//             isVerified: user.isVerified,
//             picture: user.picture || user.profilePhoto,
//             authMethod: user.authMethod,
//             isRegistered: true
//           };
//         } catch (error) {
//           console.error('❌ Auth error:', error);
//           return null;
//         }
//       }
//     })
//   ],

//   callbacks: {
//     async signIn({ user, account, profile }) {
//       if (account?.provider === 'google') {
//         try {
//           await connectDB();
          
//           // Check if user already exists
//           const existingUser = await User.findOne({
//             $or: [
//               { email: user.email },
//               { googleId: account.providerAccountId }
//             ]
//           });
          
//           if (existingUser) {
//             // Update Google ID if missing
//             if (!existingUser.googleId) {
//               await User.findByIdAndUpdate(existingUser._id, {
//                 googleId: account.providerAccountId,
//                 picture: user.image,
//                 emailVerified: true,
//                 isVerified: true,
//                 authMethod: 'google',
//                 $addToSet: { providers: 'google' }
//               });
//             }
            
//             // Update user object with existing data
//             user.id = existingUser._id.toString();
//             user.role = existingUser.role;
//             user.username = existingUser.username;
//             user.phone = existingUser.phone;
//             user.isVerified = existingUser.isVerified;
//             user.authMethod = existingUser.authMethod;
//             user.isRegistered = !!(existingUser.role && existingUser.location);
            
//             return true;
//           } else {
//             // New Google user - needs onboarding
//             user.needsOnboarding = true;
//             user.isNewUser = true;
//             user.authMethod = 'google';
//             user.isRegistered = false;
//             return true;
//           }
//         } catch (error) {
//           console.error('Google sign-in error:', error);
//           return false;
//         }
//       }
      
//       return true;
//     },

//     async jwt({ token, user, account }) {
//       if (account?.provider === 'google') {
//         token.accessToken = account.access_token;
//         token.googleId = account.providerAccountId;
//       }
      
//       if (user) {
//         token.id = user.id;
//         token.role = user.role;
//         token.username = user.username;
//         token.phone = user.phone;
//         token.isVerified = user.isVerified;
//         token.authMethod = user.authMethod || (account?.provider === 'google' ? 'google' : 'email');
//         token.needsOnboarding = user.needsOnboarding;
//         token.isRegistered = user.isRegistered;
//         token.isNewUser = user.isNewUser;
//         token.picture = user.image || user.picture;
//       }
      
//       return token;
//     },

//     async session({ session, token }) {
//       if (session.user) {
//         session.user.id = token.id;
//         session.user.role = token.role;
//         session.user.username = token.username;
//         session.user.phone = token.phone;
//         session.user.isVerified = token.isVerified;
//         session.user.authMethod = token.authMethod;
//         session.user.needsOnboarding = token.needsOnboarding;
//         session.user.isRegistered = token.isRegistered;
//         session.user.isNewUser = token.isNewUser;
//         session.user.googleId = token.googleId;
        
//         if (token.picture) {
//           session.user.image = token.picture;
//         }
//       }
      
//       return session;
//     }
//   },

//   pages: {
//     signIn: '/auth/signin',
//     error: '/auth/error'
//   },

//   session: {
//     strategy: 'jwt',
//     maxAge: 30 * 24 * 60 * 60, // 30 days
//   },

//   events: {
//     async signIn({ user, account, isNewUser }) {
//       console.log('✅ Sign-in event:', { 
//         userEmail: user.email, 
//         provider: account?.provider, 
//         isNewUser,
//         needsOnboarding: user.needsOnboarding 
//       });
//     }
//   },

//   debug: process.env.NODE_ENV === 'development'
// };

// const handler = NextAuth(authOptions);

// export { handler as GET, handler as POST };
// app/api/auth/[...nextauth]/route.js - Updated to use fixed lib/auth.js
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };