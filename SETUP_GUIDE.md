# 🚀 Fixly Platform Complete Setup Guide

This guide will help you set up the Fixly job marketplace platform with ALL real-time features working properly.

## 📋 Prerequisites

Before starting, ensure you have these installed:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **MongoDB** - [Download](https://www.mongodb.com/download-center/community) OR use [MongoDB Atlas](https://cloud.mongodb.com/)
3. **Redis** - [Download](https://redis.io/download) OR use [Redis Cloud](https://redislabs.com/)
4. **Git** - [Download](https://git-scm.com/)

## 🔧 1. Environment Setup

1. **Copy environment variables:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your .env.local file with real credentials:**

### Required for Core Functionality:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-32-character-secret-key
MONGODB_URI=mongodb://localhost:27017/fixly
REDIS_URL=redis://localhost:6379
```

### For Authentication (at least one required):
```env
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

### For Real-time Features:
```env
JWT_SECRET=another-32-character-secret-for-jwt
```

## 🗄️ 2. Database Setup

### MongoDB Setup:

**Option A: Local MongoDB**
1. Install and start MongoDB:
   ```bash
   # Windows (if using MongoDB Compass)
   # Start MongoDB service from Services

   # macOS with Homebrew
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

**Option B: MongoDB Atlas (Recommended)**
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a new cluster
3. Add your IP to whitelist
4. Create database user
5. Get connection string and add to .env.local

### Redis Setup:

**Option A: Local Redis**
```bash
# Windows (using WSL or Redis for Windows)
redis-server

# macOS with Homebrew
brew services start redis

# Linux
sudo systemctl start redis
```

**Option B: Redis Cloud (Recommended for production)**
1. Create account at [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
2. Create database
3. Get connection URL and add to .env.local

## 🔐 3. Authentication Setup

### Google OAuth Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to .env.local

## 📦 4. Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Verify setup:**
   ```bash
   npm run verify:setup
   ```

## 🚀 5. Running the Application

### Development Mode:
```bash
# Start with real-time features
npm run dev

# Or start basic Next.js (without Socket.io)
npm run dev:next
```

### Production Mode:
```bash
npm run build
npm start
```

## 🧪 6. Testing

### Run All Tests:
```bash
# Basic unit tests
npm test

# Integration tests
npm run test:integration

# Real-time feature tests
npm run test:realtime

# All tests
npm run test:all
```

### Test Coverage:
```bash
npm run test:coverage
```

## 🏗️ 7. Admin Dashboard Access

### Create Admin User:

1. **Register normally through the app**
2. **Manually update user role in MongoDB:**
   ```javascript
   // Connect to MongoDB
   use fixly
   
   // Update your user to admin
   db.users.updateOne(
     { email: "your-email@example.com" },
     { $set: { role: "admin" } }
   )
   ```

3. **Access admin dashboard:**
   - Go to `http://localhost:3000/admin`
   - Or `http://localhost:3000/dashboard/admin`

## 🔄 8. Real-time Features

### What's Included:
- ✅ **Real-time job notifications**
- ✅ **Live messaging between users**
- ✅ **Instant application updates**
- ✅ **Online/offline user status**
- ✅ **Live admin dashboard stats**
- ✅ **Real-time error monitoring**
- ✅ **Performance tracking**

### Testing Real-time Features:
1. Open two browser windows/tabs
2. Log in as different users
3. Post a job in one window
4. Apply for job in other window
5. See real-time notifications and updates

## 📊 9. Analytics & Monitoring

### Performance Monitoring:
- Automatic Web Vitals tracking (LCP, FID, CLS)
- Real User Monitoring (RUM)
- API performance tracking
- Memory usage monitoring

### Analytics Events:
- User actions tracking
- Job posting/application events
- Page views and interactions
- Error tracking

## 🔧 10. Troubleshooting

### Common Issues:

**Port already in use:**
```bash
# Kill process on port 3000
npx kill-port 3000
```

**MongoDB connection issues:**
```bash
# Check if MongoDB is running
mongodb --version
mongosh  # Try connecting
```

**Redis connection issues:**
```bash
# Check if Redis is running
redis-cli ping  # Should return PONG
```

**Socket.io not connecting:**
- Check firewall settings
- Ensure port 3000 is open
- Check browser console for errors

### Debug Mode:
```bash
DEBUG=fixly:* npm run dev
```

## 🏠 11. Production Deployment

### Environment Variables for Production:
```env
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
# Use production database URLs
# Use stronger secrets
```

### Build and Deploy:
```bash
npm run build
npm start
```

## 📈 12. Scaling

### For High Traffic:
1. Use MongoDB Atlas clusters
2. Use Redis Cloud with clustering
3. Deploy to multiple instances
4. Use load balancers
5. Enable CDN for static assets

## 🆘 13. Getting Help

If you encounter any issues:

1. **Check logs:** `npm run dev` and look for error messages
2. **Test connectivity:** `npm run test:realtime`
3. **Check health:** `npm run health`
4. **Contact support:** Create an issue with logs and steps to reproduce

## 🎉 14. Verification Checklist

After setup, verify these features work:

- [ ] User registration/login
- [ ] Job posting and browsing
- [ ] Real-time notifications
- [ ] Admin dashboard access
- [ ] File uploads
- [ ] Search functionality
- [ ] Payment integration (if configured)
- [ ] Email notifications (if configured)
- [ ] Mobile responsiveness

## 🚀 Ready to Go!

Your Fixly platform is now fully set up with:
- Real-time features with Socket.io
- Redis caching and rate limiting
- Comprehensive testing suite
- Admin dashboard
- Performance monitoring
- Mobile-responsive design
- Production-ready architecture

**Happy coding! 🎊**