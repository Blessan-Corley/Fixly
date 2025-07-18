'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  Mail, 
  Lock, 
  Eye,
  EyeOff,
  Smartphone,
  Chrome,
  Loader,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { PhoneAuth, RateLimiter } from '../../../lib/firebase';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  
  // Form states
  const [loginMethod, setLoginMethod] = useState(''); // 'phone', 'email', 'google'
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: ''
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Phone authentication
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [phoneAuth] = useState(new PhoneAuth());
  const [otpCountdown, setOtpCountdown] = useState(0);
  const recaptchaRef = useRef(null);

  // Countdown timer for OTP
  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Check if user is already authenticated
  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  // Handle URL errors
  useEffect(() => {
    if (error) {
      switch (error) {
        case 'CredentialsSignin':
          toast.error('Invalid credentials. Please check your details.');
          break;
        case 'OAuthCallback':
          toast.error('Error with Google authentication. Please try again.');
          break;
        case 'AccessDenied':
          toast.error('Access denied. Your account may be suspended.');
          break;
        default:
          toast.error('Authentication error. Please try again.');
      }
    }
  }, [error]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (loginMethod === 'email') {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
    }

    if (loginMethod === 'phone') {
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signIn('google', { 
        callbackUrl: '/dashboard',
        redirect: false 
      });
      
      if (result?.error) {
        toast.error('Google authentication failed');
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        loginMethod: 'email',
        redirect: false
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Login successful!');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Email login error:', error);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;

    const rateCheck = RateLimiter.canSendOTP(formData.phone);
    if (!rateCheck.allowed) {
      toast.error(rateCheck.message);
      return;
    }

    setLoading(true);
    try {
      const result = await phoneAuth.sendOTP(formData.phone, 'recaptcha-container');
      
      if (result.success) {
        setOtpSent(true);
        setOtpCountdown(60);
        RateLimiter.recordOTPAttempt(formData.phone);
        toast.success('OTP sent successfully');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('OTP send error:', error);
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await phoneAuth.verifyOTP(otp);
      
      if (result.success) {
        // Now sign in with NextAuth
        const signInResult = await signIn('credentials', {
          phone: formData.phone,
          loginMethod: 'phone',
          redirect: false
        });

        if (signInResult?.error) {
          toast.error(signInResult.error);
        } else {
          toast.success('Login successful!');
          router.push('/dashboard');
        }
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('OTP verify error:', error);
      toast.error('OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const renderLoginMethodSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-fixly-text mb-2">
          Choose Sign In Method
        </h2>
        <p className="text-fixly-text-light">
          How would you like to sign in?
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => setLoginMethod('google')}
          className="w-full p-4 rounded-xl border-2 border-fixly-border hover:border-fixly-accent transition-colors duration-200"
        >
          <div className="flex items-center">
            <Chrome className="h-6 w-6 text-fixly-accent mr-3" />
            <div className="text-left">
              <div className="font-semibold text-fixly-text">Continue with Google</div>
              <div className="text-sm text-fixly-text-light">Quick and secure</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setLoginMethod('phone')}
          className="w-full p-4 rounded-xl border-2 border-fixly-border hover:border-fixly-accent transition-colors duration-200"
        >
          <div className="flex items-center">
            <Smartphone className="h-6 w-6 text-fixly-accent mr-3" />
            <div className="text-left">
              <div className="font-semibold text-fixly-text">Continue with Phone</div>
              <div className="text-sm text-fixly-text-light">Verify with OTP</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setLoginMethod('email')}
          className="w-full p-4 rounded-xl border-2 border-fixly-border hover:border-fixly-accent transition-colors duration-200"
        >
          <div className="flex items-center">
            <Mail className="h-6 w-6 text-fixly-accent mr-3" />
            <div className="text-left">
              <div className="font-semibold text-fixly-text">Continue with Email</div>
              <div className="text-sm text-fixly-text-light">Use email and password</div>
            </div>
          </div>
        </button>
      </div>
    </motion.div>
  );

  const renderGoogleAuth = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-fixly-text mb-2">
          Sign in with Google
        </h2>
        <p className="text-fixly-text-light">
          Click below to continue with your Google account
        </p>
      </div>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="btn-primary w-full py-4 text-lg"
      >
        {loading ? (
          <Loader className="animate-spin h-5 w-5 mr-2" />
        ) : (
          <Chrome className="h-5 w-5 mr-2" />
        )}
        Continue with Google
      </button>

      <button
        onClick={() => setLoginMethod('')}
        className="btn-ghost w-full"
      >
        Back to options
      </button>
    </motion.div>
  );

  const renderEmailAuth = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-fixly-text mb-2">
          Sign in with Email
        </h2>
        <p className="text-fixly-text-light">
          Enter your email and password
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email"
              className="input-field pl-10"
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter your password"
              className="input-field pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-fixly-text-muted" />
              ) : (
                <Eye className="h-5 w-5 text-fixly-text-muted" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        <button
          onClick={handleEmailSignIn}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <Loader className="animate-spin h-5 w-5 mr-2" />
          ) : null}
          Sign In
        </button>

        <div className="text-center">
          <a href="#" className="text-fixly-accent hover:text-fixly-accent-dark text-sm">
            Forgot your password?
          </a>
        </div>
      </div>

      <button
        onClick={() => setLoginMethod('')}
        className="btn-ghost w-full"
      >
        Back to options
      </button>
    </motion.div>
  );

  const renderPhoneAuth = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-fixly-text mb-2">
          Sign in with Phone
        </h2>
        <p className="text-fixly-text-light">
          We'll send you a verification code
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter 10-digit phone number"
              className="input-field pl-10"
              disabled={otpSent}
            />
          </div>
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        {!otpSent ? (
          <button
            onClick={handleSendOTP}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <Loader className="animate-spin h-5 w-5 mr-2" />
            ) : null}
            Send OTP
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="input-field text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader className="animate-spin h-5 w-5 mr-2" />
              ) : null}
              Verify OTP
            </button>

            {otpCountdown > 0 ? (
              <p className="text-center text-fixly-text-muted">
                Resend OTP in {otpCountdown}s
              </p>
            ) : (
              <button
                onClick={handleSendOTP}
                className="w-full text-fixly-accent hover:text-fixly-accent-dark"
              >
                Resend OTP
              </button>
            )}
          </div>
        )}

        <div ref={recaptchaRef} id="recaptcha-container"></div>
      </div>

      <button
        onClick={() => {
          setLoginMethod('');
          setOtpSent(false);
          setOtp('');
          phoneAuth.cleanup();
        }}
        className="btn-ghost w-full"
      >
        Back to options
      </button>
    </motion.div>
  );

  const renderContent = () => {
    if (loginMethod === 'google') return renderGoogleAuth();
    if (loginMethod === 'email') return renderEmailAuth();
    if (loginMethod === 'phone') return renderPhoneAuth();
    return renderLoginMethodSelection();
  };

  return (
    <div className="min-h-screen bg-fixly-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fixly-text mb-2">
            Welcome Back
          </h1>
          <p className="text-fixly-text-light">
            Sign in to your Fixly account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 text-sm">
                Authentication failed. Please try again.
              </span>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="card">
          {renderContent()}
        </div>

        {/* Sign Up Link */}
        <div className="text-center mt-6">
          <p className="text-fixly-text-light">
            Don't have an account?{' '}
            <button
              onClick={() => router.push('/auth/signup')}
              className="text-fixly-accent hover:text-fixly-accent-dark font-medium"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}