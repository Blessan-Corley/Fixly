# Phone & Email Verification Setup Guide

## 🔧 Required Services & Environment Variables

### 1. **SMS Service Provider (Choose One)**

#### Option A: Twilio (Recommended - Most Reliable)
```env
# Add to .env.local
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```
- Sign up: https://www.twilio.com/
- Cost: ~$0.0075 per SMS
- Benefits: Global reach, reliable delivery, detailed logs

#### Option B: TextLocal (India-focused, Cheaper)
```env
# Add to .env.local
TEXTLOCAL_API_KEY=your_api_key
TEXTLOCAL_SENDER=FIXLY
```
- Sign up: https://www.textlocal.in/
- Cost: ~₹0.25 per SMS
- Benefits: India-specific, bulk SMS support

#### Option C: Firebase Phone Auth (Free Quota)
```env
# No additional env vars needed - uses existing Firebase config
# Free: 10,000 verifications/month
# Paid: $0.006 per verification after quota
```

### 2. **Current Setup Status**
✅ **Firebase Admin SDK** - Ready
✅ **Gmail SMTP** - Ready  
✅ **MongoDB** - Ready
✅ **Environment Variables** - Configured

## 🚀 Implementation Plan

### Phase 1: Core Verification System
1. **OTP Generation & Storage**
   - Secure 6-digit OTP generation
   - Time-based expiry (5 minutes)
   - Rate limiting (max 3 attempts)

2. **Phone Verification APIs**
   - `/api/auth/send-phone-otp` - Send OTP to phone
   - `/api/auth/verify-phone-otp` - Verify phone OTP

3. **Email Verification APIs**
   - `/api/auth/send-email-verification` - Send verification email
   - `/api/auth/verify-email` - Verify email via link/OTP

### Phase 2: Enhanced Security
1. **Rate Limiting**
   - IP-based limits
   - User-based limits
   - Exponential backoff

2. **Security Features**
   - Encrypted OTP storage
   - Failed attempt tracking
   - Suspicious activity detection

### Phase 3: User Experience
1. **Frontend Components**
   - OTP input component
   - Verification flow UI
   - Resend OTP functionality

2. **Notifications**
   - SMS templates
   - Email templates
   - In-app notifications

## 💡 Recommendations

### For MVP (Start Here):
1. **Use Firebase Phone Auth** - Free quota, easy setup
2. **Use Gmail SMTP** - Already configured
3. **Simple OTP flow** - 6-digit codes, 5-minute expiry

### For Production:
1. **Add Twilio** - Better reliability and delivery rates
2. **Implement rate limiting** - Prevent abuse
3. **Add backup SMS provider** - Failover capability

## 🔐 Security Considerations

1. **OTP Storage**: Store hashed OTPs, not plain text
2. **Rate Limiting**: Prevent spam and abuse
3. **Expiry**: Short expiry times (5 minutes)
4. **Attempts**: Limit verification attempts (3 max)
5. **Cleanup**: Clean expired tokens regularly

## 📱 User Flow

### Phone Verification:
1. User enters phone number
2. System sends OTP via SMS
3. User enters OTP
4. System verifies and marks phone as verified

### Email Verification:
1. User registers with email
2. System sends verification link + OTP
3. User clicks link OR enters OTP
4. System marks email as verified

### Combined Verification:
1. User must verify both phone AND email
2. Account is fully verified only after both
3. Different access levels based on verification status