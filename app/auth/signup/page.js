'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  Mail, 
  Lock, 
  User, 
  MapPin, 
  Check,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Chrome,
  Loader,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { searchCities, skillCategories } from '../../../data/cities';

// Username validation
const validateUsername = (username) => {
  if (!username || username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 20) {
    return { valid: false, error: 'Username cannot exceed 20 characters' };
  }
  
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain lowercase letters, numbers, and underscores' };
  }
  
  if (/^\d+$/.test(username)) {
    return { valid: false, error: 'Username cannot be only numbers' };
  }
  
  if (username.startsWith('_') || username.endsWith('_')) {
    return { valid: false, error: 'Username cannot start or end with underscore' };
  }
  
  if (username.includes('__')) {
    return { valid: false, error: 'Username cannot contain consecutive underscores' };
  }
  
  const reserved = ['admin', 'root', 'fixly', 'api', 'dashboard'];
  if (reserved.includes(username)) {
    return { valid: false, error: 'This username is reserved' };
  }
  
  return { valid: true };
};

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRole = searchParams.get('role') || 'fixer';
  const method = searchParams.get('method');
  
  // Form steps
  const [currentStep, setCurrentStep] = useState(1);
  const [authMethod, setAuthMethod] = useState(method || '');
  
  // Form data
  const [formData, setFormData] = useState({
    role: urlRole,
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    location: null,
    skills: [],
    termsAccepted: false
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  
  // Search states
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Check for existing session and handle Google auth
  useEffect(() => {
    const checkExistingUser = async () => {
      try {
        const session = await getSession();
        console.log('🔍 Checking existing session:', session);
        
        if (session?.user) {
          // Check if user has completed profile
          const isProfileComplete = session.user.isRegistered && 
                                  session.user.role && 
                                  session.user.username && 
                                  !session.user.username.startsWith('temp_');
          
          if (isProfileComplete) {
            console.log('✅ User already registered, redirecting to dashboard');
            toast.success('Welcome back!');
            router.replace('/dashboard');
            return;
          }
          
          // User exists but needs to complete profile
          if (session.user.email && session.user.name) {
            console.log('🔄 Existing user with incomplete profile, pre-filling data');
            
            setGoogleUser(session.user);
            setAuthMethod(session.user.authMethod || 'google');
            
            const emailUsername = session.user.email.split('@')[0]
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '')
              .slice(0, 10);
            
            setFormData(prev => ({
              ...prev,
              name: session.user.name,
              email: session.user.email,
              username: session.user.username?.startsWith('temp_') 
                ? emailUsername 
                : (session.user.username || emailUsername),
              role: session.user.role || urlRole || 'fixer'
            }));
            
            // Skip to profile completion step
            setCurrentStep(3);
            toast.info('Please complete your profile setup');
            return;
          }
        }
        
        console.log('👤 New user signup');
        
      } catch (error) {
        console.error('Session check error:', error);
        toast.error('Authentication error. Please try again.');
      }
    };

    checkExistingUser();
  }, [router, urlRole]);

  // Username availability check
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length < 3) {
        setUsernameAvailable(null);
        setErrors(prev => ({ ...prev, username: '' }));
        return;
      }

      const validation = validateUsername(formData.username);
      if (!validation.valid) {
        setUsernameAvailable(false);
        setCheckingUsername(false);
        setErrors(prev => ({ ...prev, username: validation.error }));
        return;
      }

      setCheckingUsername(true);
      try {
        const response = await fetch('/api/auth/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: formData.username })
        });
        
        const data = await response.json();
        setUsernameAvailable(data.available);
        
        if (!data.available) {
          setErrors(prev => ({ ...prev, username: data.message || 'Username is taken' }));
        } else {
          setErrors(prev => ({ ...prev, username: '' }));
        }
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameAvailable(false);
        setErrors(prev => ({ ...prev, username: 'Unable to check username availability' }));
      } finally {
        setCheckingUsername(false);
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [formData.username]);

  // City search
  useEffect(() => {
    if (citySearch.length > 0) {
      const results = searchCities(citySearch);
      setCityResults(results);
      setShowCityDropdown(results.length > 0);
    } else {
      setCityResults([]);
      setShowCityDropdown(false);
    }
  }, [citySearch]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!authMethod) {
          newErrors.authMethod = 'Please select an authentication method';
        }
        break;
        
      case 2:
        if (authMethod === 'email') {
          if (!formData.email) {
            newErrors.email = 'Email is required';
          } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
          }
          
          if (!formData.password) {
            newErrors.password = 'Password is required';
          } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
          }
          
          if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
          }
        }
        break;
        
      case 3:
        if (!formData.name.trim()) {
          newErrors.name = 'Full name is required';
        }
        
        if (!formData.username.trim()) {
          newErrors.username = 'Username is required';
        } else {
          const validation = validateUsername(formData.username);
          if (!validation.valid) {
            newErrors.username = validation.error;
          } else if (usernameAvailable === false) {
            newErrors.username = 'Username is already taken';
          }
        }
        
        if (!formData.email) {
          newErrors.email = 'Email is required';
        }
        
        if (authMethod === 'email' && !formData.phone) {
          newErrors.phone = 'Phone number is required';
        }
        break;
        
      case 4:
        if (!formData.location) {
          newErrors.location = 'Please select your city';
        }
        
        if (formData.role === 'fixer' && formData.skills.length === 0) {
          newErrors.skills = 'Please select at least one skill';
        }
        
        if (!formData.termsAccepted) {
          newErrors.terms = 'Please accept the terms and conditions';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setErrors({});
    setCurrentStep(prev => prev - 1);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      console.log('🔄 Starting Google authentication...');
      
      // Clear any existing session
      await signOut({ redirect: false });
      
      // Start Google OAuth
      await signIn('google', { 
        callbackUrl: `/auth/signup?role=${formData.role}&method=google`
      });
      
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('Google authentication failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    
    try {
      console.log('📝 Submitting signup data for:', formData.email, 'Method:', authMethod);
      
      const formattedPhone = formData.phone ? `+91${formData.phone.replace(/[^\d]/g, '')}` : '';
      
      if (authMethod === 'google' && googleUser) {
        // Google completion API
        console.log('🔄 Using Google completion API');
        
        const googleCompletionData = {
          role: formData.role,
          phone: formattedPhone,
          location: formData.location ? {
            city: formData.location.name,
            state: formData.location.state,
            lat: formData.location.lat || 0,
            lng: formData.location.lng || 0
          } : null
        };
        
        if (formData.role === 'fixer') {
          googleCompletionData.skills = formData.skills;
        }
        
        const response = await fetch('/api/auth/complete-google-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(googleCompletionData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast.success('Profile completed successfully! 🎉');
          
          // Wait for session to update
          setTimeout(() => {
            router.replace('/dashboard');
          }, 1000);
        } else {
          console.error('❌ Google completion failed:', data);
          toast.error(data.message || 'Failed to complete profile. Please try again.');
        }
        
      } else {
        // Regular signup flow
        console.log('🔄 Using regular signup API');
        
        const submitData = {
          name: formData.name.trim(),
          username: formData.username.trim().toLowerCase(),
          email: formData.email.trim().toLowerCase(),
          phone: formattedPhone,
          role: formData.role,
          location: formData.location ? {
            city: formData.location.name,
            state: formData.location.state,
            lat: formData.location.lat || 0,
            lng: formData.location.lng || 0
          } : null,
          termsAccepted: formData.termsAccepted,
          authMethod: authMethod
        };
        
        if (formData.role === 'fixer') {
          submitData.skills = formData.skills;
        }
        
        if (authMethod === 'email') {
          submitData.password = formData.password;
          submitData.confirmPassword = formData.confirmPassword;
        } else if (authMethod === 'google' && googleUser) {
          submitData.googleId = googleUser.googleId || googleUser.id;
          submitData.picture = googleUser.image || googleUser.picture;
          submitData.isVerified = true;
          submitData.emailVerified = true;
        }

        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast.success('Account created successfully! 🎉');
          
          if (authMethod === 'email') {
            // Sign in the user
            const result = await signIn('credentials', {
              email: formData.email,
              password: formData.password,
              loginMethod: 'email',
              redirect: false
            });
            
            if (result?.error) {
              toast.error('Account created but login failed. Please try signing in manually.');
              router.push('/auth/signin?message=signup_complete');
            } else {
              router.push('/dashboard');
            }
          } else {
            router.push('/dashboard');
          }
        } else {
          console.error('❌ Signup failed:', data);
          toast.error(data.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('💥 Signup error:', error);
      toast.error('Registration failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const addSkill = (skill) => {
    if (!formData.skills.includes(skill)) {
      handleInputChange('skills', [...formData.skills, skill]);
    }
  };

  const removeSkill = (skillToRemove) => {
    handleInputChange('skills', formData.skills.filter(skill => skill !== skillToRemove));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-fixly-text mb-2">
                Choose Authentication Method
              </h2>
              <p className="text-fixly-text-light">
                How would you like to create your account?
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setAuthMethod('google')}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                  authMethod === 'google' 
                    ? 'border-fixly-accent bg-fixly-accent/10' 
                    : 'border-fixly-border hover:border-fixly-accent'
                }`}
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
                onClick={() => setAuthMethod('email')}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                  authMethod === 'email' 
                    ? 'border-fixly-accent bg-fixly-accent/10' 
                    : 'border-fixly-border hover:border-fixly-accent'
                }`}
              >
                <div className="flex items-center">
                  <Mail className="h-6 w-6 text-fixly-accent mr-3" />
                  <div className="text-left">
                    <div className="font-semibold text-fixly-text">Continue with Email</div>
                    <div className="text-sm text-fixly-text-light">Create with password</div>
                  </div>
                </div>
              </button>
            </div>

            {errors.authMethod && (
              <p className="text-red-500 text-sm mt-2">{errors.authMethod}</p>
            )}
          </motion.div>
        );

      case 2:
        if (authMethod === 'google') {
          return (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center space-y-6"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-fixly-text mb-2">
                  Authenticate with Google
                </h2>
                <p className="text-fixly-text-light">
                  Click below to continue with your Google account
                </p>
              </div>

              <button
                onClick={handleGoogleAuth}
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
            </motion.div>
          );
        }

        if (authMethod === 'email') {
          return (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-fixly-text mb-2">
                  Create Account
                </h2>
                <p className="text-fixly-text-light">
                  Enter your details to create your account
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
                      placeholder="Create a password"
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

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      className="input-field pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-fixly-text-muted" />
                      ) : (
                        <Eye className="h-5 w-5 text-fixly-text-muted" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        }

        return null;

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-fixly-text mb-2">
                Personal Information
              </h2>
              <p className="text-fixly-text-light">
                {authMethod === 'google' 
                  ? 'Complete your profile details' 
                  : 'Tell us a bit about yourself'
                }
              </p>
            </div>

            {/* Google User Info Display */}
            {authMethod === 'google' && googleUser && (
              <div className="mb-6 p-4 bg-fixly-accent/10 border border-fixly-accent/20 rounded-xl">
                <div className="flex items-center space-x-3">
                  {googleUser.image && (
                    <img 
                      src={googleUser.image} 
                      alt="Profile" 
                      className="w-12 h-12 rounded-full border-2 border-fixly-accent/20"
                    />
                  )}
                  <div>
                    <div className="font-medium text-fixly-text">
                      Signed in with Google
                    </div>
                    <div className="text-sm text-fixly-text-light">
                      {googleUser.email}
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-fixly-accent ml-auto" />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    className={`input-field pl-10 ${
                      authMethod === 'google' ? 'bg-gray-50 text-gray-600' : ''
                    }`}
                    disabled={authMethod === 'google'}
                  />
                  {authMethod === 'google' && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Check className="h-4 w-4 text-fixly-accent" />
                    </div>
                  )}
                </div>
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => {
                      let value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      if (value.startsWith('_')) value = value.substring(1);
                      value = value.replace(/__+/g, '_');
                      if (value.length > 20) value = value.substring(0, 20);
                      handleInputChange('username', value);
                    }}
                    placeholder="Choose a unique username"
                    className="input-field pl-10 pr-10"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {checkingUsername ? (
                      <Loader className="animate-spin h-4 w-4 text-fixly-text-muted" />
                    ) : usernameAvailable === true ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : usernameAvailable === false ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
                {errors.username && (
                  <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                )}
                {usernameAvailable === true && (
                  <p className="text-green-600 text-sm mt-1">Username is available!</p>
                )}
              </div>

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
                    className={`input-field pl-10 ${
                      authMethod === 'google' 
                        ? 'bg-gray-50 text-gray-600 cursor-not-allowed' 
                        : ''
                    }`}
                    disabled={authMethod === 'google'}
                  />
                  {authMethod === 'google' && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Check className="h-4 w-4 text-fixly-accent" />
                    </div>
                  )}
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Phone for both email and Google users */}
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      const cleanPhone = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
                      handleInputChange('phone', cleanPhone);
                    }}
                    placeholder="Enter your phone number"
                    className="input-field pl-10"
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-fixly-text mb-2">
                Location & Skills
              </h2>
              <p className="text-fixly-text-light">
                Help us connect you with the right opportunities
              </p>
            </div>

            <div className="space-y-6">
              {/* Location Selection */}
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">
                  City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                  <input
                    type="text"
                    value={formData.location ? formData.location.name : citySearch}
                    onChange={(e) => {
                      setCitySearch(e.target.value);
                      if (formData.location) {
                        handleInputChange('location', null);
                      }
                    }}
                    placeholder="Search for your city"
                    className="input-field pl-10"
                    disabled={!!formData.location}
                  />
                  {formData.location && (
                    <button
                      onClick={() => {
                        handleInputChange('location', null);
                        setCitySearch('');
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-fixly-text-muted" />
                    </button>
                  )}
                </div>
                
                {showCityDropdown && (
                  <div className="mt-1 bg-fixly-card border border-fixly-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {cityResults.map((city, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const locationData = {
                            name: city.name,
                            state: city.state,
                            lat: city.lat || 0,
                            lng: city.lng || 0
                          };
                          
                          handleInputChange('location', locationData);
                          setShowCityDropdown(false);
                          setCitySearch('');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-fixly-accent/10 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="font-medium text-fixly-text">{city.name}</div>
                        <div className="text-sm text-fixly-text-light">{city.state}</div>
                      </button>
                    ))}
                  </div>
                )}
                
                {errors.location && (
                  <p className="text-red-500 text-sm mt-1">{errors.location}</p>
                )}
              </div>

              {/* Skills Selection for Fixers */}
              {formData.role === 'fixer' && (
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Skills & Services
                  </label>
                  
                  {/* Selected Skills */}
                  {formData.skills.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {formData.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="skill-chip skill-chip-selected"
                        >
                          {skill}
                          <button
                            onClick={() => removeSkill(skill)}
                            className="ml-2 hover:text-fixly-text"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Skill Categories */}
                  <div className="space-y-4">
                    {skillCategories.map((category, categoryIndex) => (
                      <div key={categoryIndex}>
                        <h4 className="font-medium text-fixly-text mb-2">{category.category}</h4>
                        <div className="flex flex-wrap gap-2">
                          {category.skills.map((skill, skillIndex) => (
                            <button
                              key={skillIndex}
                              onClick={() => addSkill(skill)}
                              disabled={formData.skills.includes(skill)}
                              className={`skill-chip ${
                                formData.skills.includes(skill)
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:bg-fixly-accent/30'
                              }`}
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {errors.skills && (
                    <p className="text-red-500 text-sm mt-1">{errors.skills}</p>
                  )}
                </div>
              )}

              {/* Terms and Conditions */}
              <div>
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                    className="mt-1 h-4 w-4 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                  />
                  <span className="text-sm text-fixly-text">
                    I agree to the{' '}
                    <a href="/terms" className="text-fixly-accent hover:underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-fixly-accent hover:underline">
                      Privacy Policy
                    </a>
                  </span>
                </label>
                {errors.terms && (
                  <p className="text-red-500 text-sm mt-1">{errors.terms}</p>
                )}
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-fixly-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fixly-text mb-2">
            Join Fixly as a {urlRole === 'hirer' ? 'Hirer' : 'Fixer'}
          </h1>
          <p className="text-fixly-text-light">
            {urlRole === 'hirer' 
              ? 'Post jobs and hire skilled professionals' 
              : 'Find work opportunities and grow your business'
            }
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step
                    ? 'bg-fixly-accent text-fixly-text'
                    : 'bg-fixly-border text-fixly-text-muted'
                }`}
              >
                {currentStep > step ? <Check className="h-4 w-4" /> : step}
              </div>
            ))}
          </div>
          <div className="h-2 bg-fixly-border rounded-full">
            <div 
              className="h-full bg-fixly-accent rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="card">
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {currentStep > 1 && (
              <button
                onClick={handlePrevStep}
                className="btn-ghost flex items-center"
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </button>
            )}
            
            <div className="ml-auto">
              {currentStep < 4 ? (
                <button
                  onClick={() => {
                    if (currentStep === 1) {
                      if (authMethod === 'google') {
                        handleGoogleAuth();
                      } else if (authMethod === 'email') {
                        handleNextStep();
                      }
                    } else {
                      handleNextStep();
                    }
                  }}
                  disabled={loading || (currentStep === 1 && !authMethod)}
                  className="btn-primary flex items-center"
                >
                  {loading ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
                  {currentStep === 1 
                    ? (authMethod === 'google' ? 'Continue with Google' : 'Next')
                    : 'Next'
                  }
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary flex items-center"
                >
                  {loading ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
                  Create Account
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sign In Link */}
        <div className="text-center mt-6">
          <p className="text-fixly-text-light">
            Already have an account?{' '}
            <button
              onClick={() => router.push(`/auth/signin?role=${formData.role}`)}
              className="text-fixly-accent hover:text-fixly-accent-dark font-medium"
              disabled={loading}
            >
              Sign In
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