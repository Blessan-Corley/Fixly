'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  Mail, 
  Lock, 
  User, 
  MapPin, 
  Search,
  Check,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Smartphone,
  Chrome,
  Loader,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { PhoneAuth, RateLimiter } from '../../../lib/firebase';
import { searchCities, skillCategories, getAllSkills, searchSkills } from '../../../data/cities';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'hirer';
  
  // Form steps
  const [currentStep, setCurrentStep] = useState(1);
  const [authMethod, setAuthMethod] = useState(''); // 'phone', 'email', 'google'
  
  // Form data
  const [formData, setFormData] = useState({
    role: role,
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    location: null,
    skills: [],
    customSkill: '',
    termsAccepted: false
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  // Phone authentication
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [phoneAuth] = useState(new PhoneAuth());
  const [otpCountdown, setOtpCountdown] = useState(0);
  const recaptchaRef = useRef(null);
  
  // Search states
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillResults, setSkillResults] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

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

  // Username availability check
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length < 3) {
        setUsernameAvailable(null);
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
      } catch (error) {
        console.error('Error checking username:', error);
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

  // Skill search
  useEffect(() => {
    if (skillSearch.length > 0) {
      const results = searchSkills(skillSearch);
      setSkillResults(results);
      setShowSkillDropdown(results.length > 0);
    } else {
      setSkillResults([]);
      setShowSkillDropdown(false);
    }
  }, [skillSearch]);

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
        if (authMethod === 'phone') {
          if (!formData.phone) {
            newErrors.phone = 'Phone number is required';
          } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
            newErrors.phone = 'Please enter a valid 10-digit phone number';
          }
        } else if (authMethod === 'email') {
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
        } else if (formData.username.length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
          newErrors.username = 'Username can only contain letters, numbers, and underscores';
        } else if (usernameAvailable === false) {
          newErrors.username = 'Username is already taken';
        }
        
        if (authMethod === 'phone' && !formData.email) {
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
    setCurrentStep(prev => prev - 1);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const result = await signIn('google', { 
        callbackUrl: '/auth/onboarding',
        redirect: false 
      });
      
      if (result?.error) {
        toast.error('Google authentication failed');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!validateStep(2)) return;

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
        toast.success('Phone number verified');
        handleNextStep();
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

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      // Create account
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          authMethod
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Account created successfully!');
        
        // Sign in the user
        if (authMethod === 'email') {
          const result = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            loginMethod: 'email',
            redirect: false
          });
          
          if (result?.ok) {
            router.push('/dashboard');
          }
        } else {
          router.push('/auth/signin');
        }
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const addSkill = (skill) => {
    if (!formData.skills.includes(skill)) {
      handleInputChange('skills', [...formData.skills, skill]);
    }
    setSkillSearch('');
    setShowSkillDropdown(false);
  };

  const removeSkill = (skillToRemove) => {
    handleInputChange('skills', formData.skills.filter(skill => skill !== skillToRemove));
  };

  const addCustomSkill = () => {
    if (formData.customSkill.trim() && !formData.skills.includes(formData.customSkill.trim())) {
      addSkill(formData.customSkill.trim());
      handleInputChange('customSkill', '');
    }
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
                onClick={() => setAuthMethod('phone')}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                  authMethod === 'phone' 
                    ? 'border-fixly-accent bg-fixly-accent/10' 
                    : 'border-fixly-border hover:border-fixly-accent'
                }`}
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

        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-fixly-text mb-2">
                {authMethod === 'phone' ? 'Verify Phone Number' : 'Create Password'}
              </h2>
              <p className="text-fixly-text-light">
                {authMethod === 'phone' 
                  ? 'We\'ll send you a verification code' 
                  : 'Choose a secure password for your account'
                }
              </p>
            </div>

            {authMethod === 'phone' ? (
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
            ) : (
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
            )}
          </motion.div>
        );

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
                Tell us a bit about yourself
              </p>
            </div>

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
                    className="input-field pl-10"
                  />
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
                    onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
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

              {authMethod === 'phone' && (
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
              )}

              {authMethod === 'email' && (
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
                      placeholder="Enter your phone number"
                      className="input-field pl-10"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>
              )}
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
                          handleInputChange('location', city);
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

                  {/* Custom Skill Input */}
                  <div className="mt-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.customSkill}
                        onChange={(e) => handleInputChange('customSkill', e.target.value)}
                        placeholder="Add custom skill"
                        className="input-field flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                      />
                      <button
                        onClick={addCustomSkill}
                        disabled={!formData.customSkill.trim()}
                        className="btn-secondary px-4"
                      >
                        Add
                      </button>
                    </div>
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
            Join Fixly as a {role === 'hirer' ? 'Hirer' : 'Fixer'}
          </h1>
          <p className="text-fixly-text-light">
            {role === 'hirer' 
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
            {currentStep > 1 && authMethod !== 'google' && (
              <button
                onClick={handlePrevStep}
                className="btn-ghost flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </button>
            )}
            
            <div className="ml-auto">
              {currentStep < 4 ? (
                authMethod !== 'google' && (
                  <button
                    onClick={authMethod === 'phone' && currentStep === 2 && !otpSent 
                      ? handleSendOTP 
                      : authMethod === 'phone' && currentStep === 2 && otpSent
                      ? handleVerifyOTP
                      : handleNextStep
                    }
                    disabled={loading || (authMethod === 'phone' && currentStep === 2 && otpSent && otp.length !== 6)}
                    className="btn-primary flex items-center"
                  >
                    {loading ? (
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                    ) : null}
                    {authMethod === 'phone' && currentStep === 2 && !otpSent 
                      ? 'Send OTP'
                      : authMethod === 'phone' && currentStep === 2 && otpSent
                      ? 'Verify OTP'
                      : 'Next'
                    }
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                )
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
              onClick={() => router.push('/auth/signin')}
              className="text-fixly-accent hover:text-fixly-accent-dark font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}