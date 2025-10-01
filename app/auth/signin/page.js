'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye,
  EyeOff,
  Chrome,
  Loader,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message = searchParams.get('message');
  const role = searchParams.get('role') || 'fixer';
  
  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          // Check if user has completed registration
          if (session.user.isRegistered && session.user.role && !session.user.username?.startsWith('temp_')) {
            console.log('✅ User already signed in and registered, redirecting to dashboard');
            router.replace('/dashboard');
          }
          // If user is not fully registered, let them stay on signin page to complete flow
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };

    checkAuth();
  }, [router]);

  // Handle URL messages
  useEffect(() => {
    if (error) {
      switch (error) {
        case 'CredentialsSignin':
          toast.error('Invalid email or password. Please try again.');
          break;
        case 'OAuthCallback':
          toast.error('Google authentication failed. Please try again.');
          break;
        case 'AccessDenied':
          toast.error('Access denied. Your account may be suspended.');
          break;
        default:
          toast.error('Authentication error. Please try again.');
      }
    }

    if (message === 'signup_complete') {
      toast.success('Account created successfully! Please sign in.');
    }
  }, [error, message]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('🔄 Starting email signin');

      const result = await signIn('credentials', {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        loginMethod: 'email',
        redirect: false
      });

      console.log('📋 Signin result received');

      if (result?.error) {
        console.error('❌ Signin error:', result.error);
        
        if (result.error.includes('Google login')) {
          toast.error('This email uses Google login. Please use "Continue with Google" instead.');
        } else if (result.error.includes('complete your registration')) {
          toast.error('Please complete your registration first.');
          router.push(`/auth/signup?role=${role}`);
        } else if (result.error.includes('Invalid email or password')) {
          toast.error('Invalid email or password. If you forgot your password, click "Forgot Password" below.');
        } else if (result.error.includes('Too many login attempts')) {
          toast.error('Too many failed attempts. Please wait 15 minutes or reset your password.');
        } else {
          toast.error(result.error || 'Login failed. Please check your credentials.');
        }
      } else {
        // Success - check session and redirect
        console.log('✅ Email signin successful');
        toast.success('Welcome back!');
        
        // Small delay to ensure session is set
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      }
    } catch (error) {
      console.error('💥 Email signin error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    
    setGoogleLoading(true);
    try {
      console.log('🔄 Starting Google signin...');
      
      // Use NextAuth's signIn with proper redirect
      await signIn('google', { 
        callbackUrl: '/dashboard'
      });
      
      // This will redirect, so we don't need to handle the response
    } catch (error) {
      console.error('💥 Google signin error:', error);
      toast.error('Google authentication failed. Please try again.');
      setGoogleLoading(false);
    }
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full p-4 rounded-xl border-2 border-fixly-border hover:border-fixly-accent transition-colors duration-200 disabled:opacity-50"
            >
              <div className="flex items-center justify-center">
                {googleLoading ? (
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                ) : (
                  <Chrome className="h-5 w-5 mr-2 text-fixly-accent" />
                )}
                <span className="font-semibold text-fixly-text">
                  Continue with Google
                </span>
              </div>
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-fixly-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-fixly-card text-fixly-text-muted">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
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
                    disabled={loading || googleLoading}
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
                    disabled={loading || googleLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    disabled={loading || googleLoading}
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
                type="submit"
                disabled={loading || googleLoading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                ) : null}
                Sign In
              </button>
            </form>

            {/* Forgot Password */}
            <div className="text-center">
              <a 
                href="/auth/forgot-password" 
                className="text-fixly-accent hover:text-fixly-accent-dark text-sm"
              >
                Forgot your password?
              </a>
            </div>
          </motion.div>
        </div>

        {/* Sign Up Link */}
        <div className="text-center mt-6">
          <p className="text-fixly-text-light">
            Don&rsquo;t have an account?{' '}
            <button
              onClick={() => router.push(`/auth/signup?role=${role}`)}
              className="text-fixly-accent hover:text-fixly-accent-dark font-medium"
              disabled={loading || googleLoading}
            >
              Sign Up
            </button>
          </p>
        </div>

        {/* Footer Navigation */}
        <div className="text-center mt-8 pt-6 border-t border-fixly-border space-y-3">
          <div>
            <a 
              href="/"
              className="text-fixly-text-light hover:text-fixly-accent text-sm transition-colors"
            >
              ← Back to Home
            </a>
          </div>
          <div className="flex justify-center items-center space-x-4 text-xs text-fixly-text-light">
            <a 
              href="/contact" 
              className="hover:text-fixly-accent transition-colors"
            >
              Contact Us
            </a>
            <span>•</span>
            <a 
              href="/help" 
              className="hover:text-fixly-accent transition-colors"
            >
              Help
            </a>
            <span>•</span>
            <a 
              href="/terms" 
              className="hover:text-fixly-accent transition-colors"
            >
              Terms
            </a>
            <span>•</span>
            <a 
              href="/privacy" 
              className="hover:text-fixly-accent transition-colors"
            >
              Privacy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}