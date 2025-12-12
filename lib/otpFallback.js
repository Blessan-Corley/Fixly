// lib/otpFallback.js - In-memory OTP storage as fallback when Redis is unavailable
// This is NOT for production use - only for development/testing

const otpStore = new Map();

// Clean up expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 60000);

export const fallbackOtpStorage = {
  /**
   * Store OTP in memory
   */
  async store(email, otp, purpose, ttlSeconds) {
    try {
      const key = `${email}:${purpose}`;
      const expiresAt = Date.now() + (ttlSeconds * 1000);
      
      otpStore.set(key, {
        otp,
        createdAt: Date.now(),
        expiresAt
      });
      
      console.log(`✅ [Fallback] OTP stored in memory for ${email} (${purpose})`);
      return true;
    } catch (error) {
      console.error('❌ [Fallback] Failed to store OTP:', error);
      return false;
    }
  },

  /**
   * Verify OTP from memory
   */
  async verify(email, inputOTP, purpose) {
    try {
      const key = `${email}:${purpose}`;
      const data = otpStore.get(key);

      if (!data) {
        return { success: false, message: 'OTP not found or expired' };
      }

      // Check if expired
      if (Date.now() > data.expiresAt) {
        otpStore.delete(key);
        return { success: false, message: 'OTP has expired' };
      }

      // Verify OTP
      if (String(data.otp) === String(inputOTP)) {
        otpStore.delete(key); // Delete after successful verification
        return { success: true, message: 'OTP verified successfully' };
      }

      return { success: false, message: 'Invalid OTP' };
    } catch (error) {
      console.error('❌ [Fallback] Failed to verify OTP:', error);
      return { success: false, message: 'Error verifying OTP' };
    }
  },

  /**
   * Check if OTP exists
   */
  async exists(email, purpose) {
    const key = `${email}:${purpose}`;
    const data = otpStore.get(key);
    
    if (!data) return false;
    
    // Check if expired
    if (Date.now() > data.expiresAt) {
      otpStore.delete(key);
      return false;
    }
    
    return true;
  },

  /**
   * Delete OTP
   */
  async delete(email, purpose) {
    const key = `${email}:${purpose}`;
    otpStore.delete(key);
    return true;
  },

  /**
   * Get stats for debugging
   */
  getStats() {
    return {
      totalStored: otpStore.size,
      keys: Array.from(otpStore.keys())
    };
  }
};

export default fallbackOtpStorage;
