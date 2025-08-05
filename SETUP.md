# Fixly Setup Guide

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the project root with the following variables:

```env
# Required: Database Connection
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE

# Required: NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Optional: Google OAuth (for Google login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional: Other services
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 3. MongoDB Setup
You need a MongoDB database. You can use:
- **MongoDB Atlas** (free tier available): https://www.mongodb.com/atlas
- **Local MongoDB**: Install MongoDB locally
- **Other MongoDB providers**: Any MongoDB-compatible service

### 4. Google OAuth Setup (Optional)
1. Go to https://console.developers.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

### 5. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Troubleshooting

### "Failed to load user profile" Error
This usually means:
1. **Missing MONGODB_URI**: Check your `.env.local` file
2. **Database connection issues**: Verify your MongoDB connection string
3. **Session problems**: Clear browser cookies and try again

### "Authentication required" Error
This means:
1. **Missing NEXTAUTH_SECRET**: Add a secret key to `.env.local`
2. **Session expired**: Sign in again

### Google Login Not Working
1. **Missing Google credentials**: Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
2. **Wrong redirect URI**: Ensure it matches your Google OAuth setup
3. **Domain not authorized**: Add localhost to authorized domains in Google Console

## Development Notes

- The app will work without Google OAuth (email login only)
- Database connection is required for full functionality
- All environment variables are validated on startup
- Check console logs for detailed error messages

## Production Deployment

For production, ensure:
1. All environment variables are set
2. Use a strong NEXTAUTH_SECRET
3. Set NEXTAUTH_URL to your production domain
4. Use a production MongoDB instance
5. Configure proper CORS and security headers 