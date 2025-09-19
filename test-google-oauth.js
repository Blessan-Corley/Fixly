// Test Google OAuth configuration
require('dotenv').config({ path: '.env.local' });

function testGoogleOAuth() {
  console.log('🔍 Testing Google OAuth Configuration...');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;

  console.log('🔑 Environment Variables Status:');
  console.log('✅ GOOGLE_CLIENT_ID:', !!clientId ? '✓ Set' : '❌ Missing');
  console.log('✅ GOOGLE_CLIENT_SECRET:', !!clientSecret ? '✓ Set' : '❌ Missing');
  console.log('✅ NEXTAUTH_URL:', nextAuthUrl || '❌ Missing');
  console.log('✅ NEXTAUTH_SECRET:', !!nextAuthSecret ? '✓ Set' : '❌ Missing');

  if (clientId) {
    console.log('📊 Client ID format:', clientId.endsWith('.apps.googleusercontent.com') ? '✓ Valid' : '❌ Invalid format');
  }

  // Check redirect URI
  const redirectUri = `${nextAuthUrl || 'http://localhost:3000'}/api/auth/callback/google`;
  console.log('🔄 Expected Redirect URI:', redirectUri);

  // Google OAuth URLs for testing
  const authUrl = `https://accounts.google.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile&response_type=code&prompt=consent`;

  console.log('\n🚀 Test Google OAuth manually:');
  console.log('1. Visit this URL in your browser:');
  console.log(authUrl);
  console.log('\n2. Check if redirect URI matches what you configured in Google Console');
  console.log('\n3. Expected redirect after auth:', redirectUri);

  // Configuration recommendations
  console.log('\n💡 Google Console Configuration:');
  console.log('- Authorized JavaScript origins: http://localhost:3000, https://yourdomain.com');
  console.log('- Authorized redirect URIs: http://localhost:3000/api/auth/callback/google');

  return {
    isConfigured: !!(clientId && clientSecret && nextAuthUrl && nextAuthSecret),
    redirectUri,
    authUrl
  };
}

const result = testGoogleOAuth();
console.log('\n📊 Configuration Status:', result.isConfigured ? '✅ Complete' : '❌ Incomplete');