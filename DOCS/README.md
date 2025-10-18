#  Fixly - Local Service Marketplace

A modern platform connecting customers with local service professionals. Built with Next.js 14, MongoDB, and designed for India's growing service economy.

##  What is Fixly?

**For Customers (Hirers):**
- Post service requests (plumbing, electrical, cleaning, etc.)
- Get quotes from verified professionals
- Track job progress and make secure payments

**For Service Providers (Fixers):**
- Browse local job opportunities
- Submit professional proposals
- Build reputation with customer reviews
- Pro plan (₹99/month) for unlimited applications

## Key Features

- **Modern Interface** - Clean, responsive design with dark/light/system themes
- **Secure Authentication** - Google OAuth + email login
- ** Real-time Updates** - Live notifications and messaging
- ** Location-based** - Connect with local professionals
- ** Pro Subscriptions** - Enhanced features for service providers
- ** Review System** - Build trust through ratings and reviews
- ** Dashboard** - Comprehensive management for all users

##  Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, Framer Motion
- **Backend:** Next.js API Routes, NextAuth.js
- **Database:** MongoDB with Mongoose
- **Authentication:** NextAuth.js (Google OAuth + Credentials)
- **Styling:** Tailwind CSS with custom design system
- **Deployment Ready:** Optimized for production

##  Quick Setup

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   cd fixly
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Copy example environment file
   cp .env.example .env.local
   
   # Required environment variables:
   MONGODB_URI=your-mongodb-connection-string
   NEXTAUTH_SECRET=your-secret-key-32-chars-minimum
   NEXTAUTH_URL=http://localhost:3000
   
   # Optional (for Google login):
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Optional (for email features):
   EMAIL_HOST=smtp.gmail.com
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Visit** http://localhost:3000

##  Production Ready

-  Security audited and production-optimized
-  Environment variables properly configured
-  Error handling and logging
-  Performance optimized
-  Mobile responsive design
-  Dark mode support with system detection

##  Contact & Support

- **Email:** blessancorley@gmail.com
- **Phone:** +91 9976768211
- **Location:** Coimbatore, Tamil Nadu, India

##  License

© 2025 Fixly Platform. All rights reserved.

---

**Ready to connect customers with trusted local professionals? Get started with Fixly today!** 