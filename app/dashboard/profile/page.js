// app/dashboard/profile/page.js
'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  Loader,
  Star,
  Award,
  Shield,
  Edit,
  X,
  Plus,
  CheckCircle,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Target,
  Clock
} from 'lucide-react';
import { useApp } from '../../providers';
import { toast } from 'sonner';
import { usePageLoading } from '../../../contexts/LoadingContext';
import { GlobalLoading } from '../../../components/ui/GlobalLoading';
import { validateContent } from '../../../lib/validations/content-validator';
import { searchCities } from '../../../data/cities';
import SkillSelector from '../../../components/SkillSelector/SkillSelector';
import { ProfileVerificationStatus } from '../../../components/dashboard/VerificationPrompt';
import EnhancedLocationSelector from '../../../components/LocationPicker/EnhancedLocationSelector';
import FirebasePhoneAuth from '../../../components/auth/FirebasePhoneAuth';
import SmartAvatar from '../../../components/ui/SmartAvatar';

export default function ProfilePage() {
  const { user, updateUser } = useApp();
  const { 
    loading: pageLoading, 
    showRefreshMessage, 
    startLoading, 
    stopLoading 
  } = usePageLoading('profile');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: null,
    skills: [],
    availableNow: true,
    serviceRadius: 10,
    preferences: {
      emailNotifications: true,
      smsNotifications: true,
      jobAlerts: true,
      marketingEmails: false
    }
  });

  // Search states
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Location picker states
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Phone verification states
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);

  // Email change states
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailOtpCountdown, setEmailOtpCountdown] = useState(0);

  // Initialize form data only once when user data is available
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user && !initialized) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || null,
        skills: user.skills || [],
        availableNow: user.availableNow ?? true,
        serviceRadius: user.serviceRadius || 10,
        preferences: {
          emailNotifications: user.preferences?.emailNotifications ?? true,
          smsNotifications: user.preferences?.smsNotifications ?? true,
          jobAlerts: user.preferences?.jobAlerts ?? true,
          marketingEmails: user.preferences?.marketingEmails ?? false
        }
      });
      setInitialized(true);
    }
  }, [user, initialized]);

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

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const keys = field.split('.');
        return {
          ...prev,
          [keys[0]]: {
            ...prev[keys[0]],
            [keys[1]]: value
          }
        };
      } else {
        return { ...prev, [field]: value };
      }
    });
  }, []);

  const selectCity = useCallback((city) => {
    handleInputChange('location', city);
    setCitySearch('');
    setShowCityDropdown(false);
  }, [handleInputChange]);

  // Password change functions
  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: minLength && hasLetter && hasNumber && hasSpecial,
      requirements: {
        minLength,
        hasLetter,
        hasNumber,
        hasSpecial
      }
    };
  };

  const handlePasswordChange = async () => {
    // Validate current password
    if (!passwordData.currentPassword) {
      toast.error('Current password is required');
      return;
    }

    // Validate new password
    const validation = validatePassword(passwordData.newPassword);
    if (!validation.isValid) {
      toast.error('New password does not meet requirements');
      return;
    }

    // Check passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    // Check if new password is different from current
    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    // Send OTP for verification
    setPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          type: 'password_reset'
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowOtpModal(true);
        setOtpSent(true);
        startCountdown();
        toast.success('OTP sent to your email for verification');
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('Failed to send OTP');
    } finally {
      setPasswordLoading(false);
    }
  };

  const verifyOtpAndChangePassword = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          otp: otp,
          email: user?.email
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Password changed successfully!');
        setShowPasswordChange(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowOtpModal(false);
        setOtp('');
        setOtpSent(false);
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setOtpLoading(false);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resendPasswordOtp = () => {
    handlePasswordChange();
  };

  // Location picker functions
  const handleLocationSelect = (location) => {
    handleInputChange('location', location);
    setShowLocationPicker(false);
    toast.success('Location updated successfully');
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/user/profile-photo', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        // Update user photo with unified field names
        updateUser({
          ...user,
          profilePhoto: data.profilePhoto,
          image: data.profilePhoto.url,
          photoURL: data.profilePhoto.url,
          picture: data.profilePhoto.url
        });
        toast.success(`Profile photo updated successfully! Next update available on ${new Date(data.profilePhoto.nextUpdateDate).toLocaleDateString()}`);
      } else {
        if (response.status === 429) {
          // Rate limited
          const daysRemaining = data.daysRemaining || 7;
          toast.error(`${data.message} (${daysRemaining} days remaining)`);
        } else {
          toast.error(data.message || 'Upload failed');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    startLoading('Saving profile changes...');
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        updateUser(data.user);
        setEditing(false);
        setInitialized(false); // Allow re-initialization with updated data
        toast.success('Profile updated successfully');
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  const ProfileSection = memo(({ title, children, editable = false }) => (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-fixly-text">{title}</h3>
        {editable && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="btn-ghost text-sm"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  ), [editing]);

  // Memoize form inputs to prevent unnecessary re-renders
  const NameInput = memo(() => (
    <div>
      <label className="block text-sm font-medium text-fixly-text mb-2">
        Full Name
      </label>
      <input
        key="name-input"
        type="text"
        value={formData.name || ''}
        onChange={(e) => handleInputChange('name', e.target.value)}
        className="input-field"
        autoComplete="name"
        autoFocus={false}
      />
    </div>
  ), [formData.name]);

  const BioInput = memo(() => {
    const [bioValidation, setBioValidation] = useState({ isValid: true, violations: [] });
    const [validating, setValidating] = useState(false);

    const validateBio = useCallback(async (text) => {
      if (!text || text.trim().length === 0) {
        setBioValidation({ isValid: true, violations: [] });
        return;
      }

      setValidating(true);
      try {
        const validation = await validateContent(text, 'profile');
        setBioValidation(validation);
      } catch (error) {
        console.warn('Bio validation failed:', error);
        setBioValidation({ isValid: true, violations: [] });
      } finally {
        setValidating(false);
      }
    }, []);

    const handleBioChange = useCallback((e) => {
      const text = e.target.value;
      handleInputChange('bio', text);
    }, []);

    // Debounce bio validation
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (formData.bio) {
          validateBio(formData.bio);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }, [formData.bio, validateBio]);

    return (
      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Bio
          {validating && (
            <span className="ml-2 text-xs text-fixly-text-muted">
              <Loader className="inline h-3 w-3 animate-spin mr-1" />
              Validating...
            </span>
          )}
        </label>
        <textarea
          key="bio-input"
          value={formData.bio || ''}
          onChange={handleBioChange}
          placeholder="Tell others about yourself... (avoid sharing phone numbers, addresses, or external contact info)"
          className={`textarea-field h-24 ${!bioValidation.isValid ? 'border-red-500 focus:border-red-500' : ''}`}
          maxLength={500}
          autoComplete="off"
        />
        <div className="mt-1 flex items-center justify-between">
          <div>
            {!bioValidation.isValid && bioValidation.violations.length > 0 && (
              <div className="text-xs text-red-500">
                <AlertCircle className="inline h-3 w-3 mr-1" />
                {bioValidation.violations[0].message}
              </div>
            )}
          </div>
          <p className="text-xs text-fixly-text-muted">
            {(formData.bio || '').length}/500 characters
          </p>
        </div>
      </div>
    );
  }, [formData.bio]);

  if (!user) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="animate-spin h-8 w-8 text-fixly-accent" />
        </div>
      </div>
    );
  }

  // Phone verification functions
  const handlePhoneVerificationComplete = async (result) => {
    console.log('Phone verification completed:', result);

    // Update user data
    if (result.user) {
      updateUser(result.user);
    }

    // Close verification modal
    setShowPhoneVerification(false);
    setNewPhoneNumber('');
    toast.success('Phone number verified successfully!');
  };

  const handlePhoneVerificationError = (error) => {
    console.error('Phone verification error:', error);
    toast.error(error.message || 'Phone verification failed');
  };

  const handlePhoneNumberUpdate = async () => {
    if (!newPhoneNumber || newPhoneNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      const response = await fetch('/api/user/update-phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: newPhoneNumber })
      });

      const data = await response.json();

      if (data.success) {
        // Update user state
        updateUser({ ...user, phone: newPhoneNumber, phoneVerified: false });

        // Start verification process
        setShowPhoneEdit(false);
        setShowPhoneVerification(true);

        toast.success('Phone number updated! Please verify it now.');
      } else {
        toast.error(data.message || 'Failed to update phone number');
      }
    } catch (error) {
      console.error('Phone update error:', error);
      toast.error('Failed to update phone number');
    }
  };

  // Email change functions with proper validation
  const validateNewEmail = async (email) => {
    try {
      // Use existing validation API
      const response = await fetch('/api/user/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Email validation error:', error);
      return { available: false, message: 'Failed to validate email' };
    }
  };

  const handleSendEmailOtp = async () => {
    if (!newEmail || !newEmail.trim()) {
      toast.error('Please enter a new email address');
      return;
    }

    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      toast.error('New email cannot be the same as current email');
      return;
    }

    // First validate the email using existing API
    setEmailChangeLoading(true);
    const validation = await validateNewEmail(newEmail.trim());

    if (!validation.available) {
      toast.error(validation.message);
      setEmailChangeLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          step: 'send_otp'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setEmailOtpSent(true);
        setEmailOtpCountdown(300); // 5 minutes countdown
        toast.success(result.message);

        // Start countdown
        const interval = setInterval(() => {
          setEmailOtpCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Email OTP send error:', error);
      toast.error('Failed to send verification code');
    } finally {
      setEmailChangeLoading(false);
    }
  };

  const handleVerifyEmailChange = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    setEmailChangeLoading(true);
    try {
      const response = await fetch('/api/user/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          otp: emailOtp,
          step: 'verify_and_change'
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update user data
        updateUser({
          ...user,
          email: newEmail.trim(),
          emailVerified: true
        });

        // Reset states
        setShowEmailChange(false);
        setNewEmail('');
        setEmailOtp('');
        setEmailOtpSent(false);
        setEmailOtpCountdown(0);

        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Email change verification error:', error);
      toast.error('Failed to verify email change');
    } finally {
      setEmailChangeLoading(false);
    }
  };

  const handleCancelEmailChange = () => {
    setShowEmailChange(false);
    setNewEmail('');
    setEmailOtp('');
    setEmailOtpSent(false);
    setEmailOtpCountdown(0);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-fixly-text mb-2">
          My Profile
        </h1>
        <p className="text-sm md:text-base text-fixly-text-light">
          Manage your profile information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        {/* Left Column - Profile Photo & Basic Info */}
        <div className="space-y-4 md:space-y-6">
          {/* Profile Photo */}
          <ProfileSection title="Profile Photo">
            <div className="text-center">
              <div className="relative inline-block">
                <SmartAvatar
                  user={user}
                  size="3xl"
                  className="mx-auto"
                />
                <label
                  htmlFor="photo-upload"
                  className="absolute bottom-0 right-0 bg-fixly-accent rounded-full p-2 cursor-pointer hover:bg-fixly-accent-dark transition-colors"
                >
                  {uploading ? (
                    <Loader className="animate-spin h-4 w-4 text-fixly-text" />
                  ) : (
                    <Camera className="h-4 w-4 text-fixly-text" />
                  )}
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm text-fixly-text-muted">
                  Click camera to change photo
                </p>
                {user.profilePhoto?.lastUpdated && (
                  <p className="text-xs text-fixly-text-muted mt-1">
                    Last updated: {new Date(user.profilePhoto.lastUpdated).toLocaleDateString()}
                    <br />
                    Next update: {new Date(new Date(user.profilePhoto.lastUpdated).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </ProfileSection>

          {/* Account Status */}
          <ProfileSection title="Account Status">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-fixly-text-muted">Verification</span>
                <div className="flex items-center">
                  {user.isVerified ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-fixly-success mr-1" />
                      <span className="text-fixly-success text-sm">Verified</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-fixly-warning mr-1" />
                      <span className="text-fixly-warning text-sm">Pending</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-fixly-text-muted">Member Since</span>
                <span className="text-sm text-fixly-text">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>

              {user.role === 'fixer' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-fixly-text-muted">Rating</span>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-fixly-warning mr-1" />
                      <span className="text-sm text-fixly-text">
                        {user.rating?.average?.toFixed(1) || '0.0'} ({user.rating?.count || 0})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-fixly-text-muted">Jobs Completed</span>
                    <span className="text-sm text-fixly-text">
                      {user.jobsCompleted || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-fixly-text-muted">Plan</span>
                    <div className="flex items-center">
                      {user.plan?.type === 'pro' ? (
                        <>
                          <Award className="h-4 w-4 text-fixly-accent mr-1" />
                          <span className="text-fixly-accent font-medium text-sm">Pro</span>
                        </>
                      ) : (
                        <span className="text-sm text-fixly-text">Free</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ProfileSection>

          {/* Account Verification */}
          <ProfileVerificationStatus user={user} showActions={true} />
        </div>

        {/* Right Column - Detailed Information */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Basic Information */}
          <ProfileSection title="Basic Information" editable={true}>
            {editing ? (
              <div className="space-y-4">
                <NameInput />
                <BioInput />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="h-4 w-4 text-fixly-accent mr-3" />
                  <div>
                    <div className="font-medium text-fixly-text">{user.name}</div>
                    <div className="text-sm text-fixly-text-muted">@{user.username}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-fixly-accent mr-3" />
                    <div className="flex items-center gap-2">
                      <span className="text-fixly-text">{user.email}</span>
                      {user.emailVerified && (
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-fixly-success mr-1" />
                          <span className="text-xs text-fixly-success font-medium">Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEmailChange(true)}
                    className="text-fixly-accent hover:text-fixly-accent-dark text-sm font-medium"
                  >
                    Change
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-fixly-accent mr-3" />
                    <div className="flex items-center gap-2">
                      <span className="text-fixly-text">{user.phone}</span>
                      {user.phoneVerified ? (
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-fixly-success mr-1" />
                          <span className="text-xs text-fixly-success font-medium">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-fixly-warning mr-1" />
                          <span className="text-xs text-fixly-warning font-medium">Not Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!user.phoneVerified && user.phone && (
                      <button
                        onClick={() => setShowPhoneVerification(true)}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        Verify
                      </button>
                    )}
                    <button
                      onClick={() => setShowPhoneEdit(true)}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {user.bio && (
                  <div>
                    <p className="text-fixly-text-muted">{user.bio}</p>
                  </div>
                )}
              </div>
            )}
          </ProfileSection>

          {/* Location */}
          <ProfileSection title="Location" editable={true}>
            {editing ? (
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">
                  Location
                </label>
                <div className="space-y-3">
                  {formData.location ? (
                    <div className="flex items-center justify-between p-3 bg-fixly-bg-secondary rounded-lg">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-fixly-accent mr-2" />
                        <div>
                          <div className="font-medium text-fixly-text">
                            {formData.location.name || formData.location.city}
                          </div>
                          {formData.location.state && (
                            <div className="text-sm text-fixly-text-muted">
                              {formData.location.state}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleInputChange('location', null)}
                        className="text-fixly-text-muted hover:text-fixly-error"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed border-fixly-border rounded-lg">
                      <MapPin className="h-8 w-8 text-fixly-text-muted mx-auto mb-2" />
                      <p className="text-fixly-text-muted mb-3">No location selected</p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowLocationPicker(true)}
                    className="w-full btn-primary"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    {formData.location ? 'Change Location' : 'Select Location'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {user.location && (user.location.city || user.location.homeAddress?.formattedAddress) ? (
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-fixly-accent mr-3 mt-1" />
                      <div>
                        <div className="text-fixly-text font-medium">
                          {user.location.city || user.location.homeAddress?.district || 'Current Location'}
                        </div>
                        {user.location.state && (
                          <div className="text-sm text-fixly-text-muted">
                            {user.location.state}
                          </div>
                        )}
                        {user.location.homeAddress?.formattedAddress && (
                          <div className="text-xs text-fixly-text-muted mt-1 max-w-xs">
                            {user.location.homeAddress.formattedAddress}
                          </div>
                        )}
                        {user.location.homeAddress?.coordinates && (
                          <div className="text-xs text-fixly-accent mt-1 flex items-center">
                            <Target className="h-3 w-3 mr-1" />
                            GPS: {user.location.homeAddress.coordinates.latitude?.toFixed(4)}, {user.location.homeAddress.coordinates.longitude?.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {user.location.accuracy && (
                        <span className="text-xs text-fixly-text-muted bg-fixly-bg rounded px-2 py-1">
                          ±{Math.round(user.location.accuracy)}m
                        </span>
                      )}
                      {user.location.timestamp && (
                        <div className="text-xs text-fixly-text-muted mt-1">
                          Updated {new Date(user.location.timestamp).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-fixly-border rounded-lg">
                    <MapPin className="h-8 w-8 text-fixly-text-muted mx-auto mb-2" />
                    <p className="text-fixly-text-muted mb-3">No location set</p>
                    <p className="text-xs text-fixly-text-muted">
                      Add your location to help hirers find you nearby
                    </p>
                  </div>
                )}

                {/* Location History Preview */}
                {user.locationHistory && user.locationHistory.length > 0 && (
                  <div className="border-t border-fixly-border pt-3 mt-3">
                    <div className="text-xs font-medium text-fixly-text-muted mb-2 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Recent Locations
                    </div>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {user.locationHistory.slice(0, 3).map((loc, index) => (
                        <div key={index} className="text-xs text-fixly-text-muted flex items-center justify-between py-1">
                          <span className="truncate">
                            {loc.city || loc.address || 'Unknown location'}
                          </span>
                          <span className="text-xs ml-2">
                            {new Date(loc.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ProfileSection>

          {/* Skills (for fixers) */}
          {user.role === 'fixer' && (
            <ProfileSection title="Skills & Services" editable={true}>
              {editing ? (
                <div className="space-y-4">
                  <SkillSelector
                    isModal={false}
                    selectedSkills={formData.skills}
                    onSkillsChange={(skills) => handleInputChange('skills', skills)}
                    maxSkills={30}
                    minSkills={1}
                    required={false}
                    className="w-full"
                  />

                  {/* Availability */}
                  <div className="pt-4 border-t border-fixly-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium text-fixly-text">Available Now</label>
                        <p className="text-sm text-fixly-text-muted">
                          Show as available for immediate work
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.availableNow}
                          onChange={(e) => handleInputChange('availableNow', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 bg-fixly-bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fixly-card after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fixly-card after:border-fixly-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fixly-accent`}></div>
                      </label>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-fixly-text mb-2">
                        Work Radius (km)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={formData.serviceRadius || 10}
                        onChange={(e) => handleInputChange('serviceRadius', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-fixly-text-muted">
                        <span>1 km</span>
                        <span>{formData.serviceRadius} km</span>
                        <span>50 km</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {user.skills && user.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.skills.map((skill, index) => (
                        <span key={index} className="skill-chip">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-fixly-text-muted">No skills added yet</p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-fixly-border">
                    <div>
                      <span className="font-medium text-fixly-text">Availability</span>
                      <p className="text-sm text-fixly-text-muted">
                        Work radius: {user.serviceRadius || 10} km
                      </p>
                    </div>
                    <div className="flex items-center">
                      {user.availableNow ? (
                        <>
                          <div className="w-2 h-2 bg-fixly-success rounded-full mr-2 animate-pulse"></div>
                          <span className="text-fixly-success text-sm">Available Now</span>
                        </>
                      ) : (
                        <span className="text-fixly-text-muted text-sm">Not Available</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </ProfileSection>
          )}

          {/* Password Change Section */}
          <ProfileSection title="Password & Security">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-fixly-text">Password</h4>
                  <p className="text-sm text-fixly-text-muted">Change your account password</p>
                </div>
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="btn-secondary text-sm"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </button>
              </div>

              {showPasswordChange && (
                <div className="p-4 bg-fixly-info-bg border border-fixly-info-bg rounded-lg space-y-4">
                  <h4 className="font-medium text-fixly-text">Change Password</h4>

                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                        className="input-field pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-fixly-text-muted hover:text-fixly-text"
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                        className="input-field pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-fixly-text-muted hover:text-fixly-text"
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Requirements */}
                    {passwordData.newPassword && (
                      <div className="mt-2 space-y-1">
                        {Object.entries({
                          minLength: 'At least 8 characters',
                          hasLetter: 'Contains letters',
                          hasNumber: 'Contains numbers',
                          hasSpecial: 'Contains special characters'
                        }).map(([key, label]) => {
                          const validation = validatePassword(passwordData.newPassword);
                          const isValid = validation.requirements[key];
                          return (
                            <div key={key} className={`flex items-center text-xs ${isValid ? 'text-fixly-success' : 'text-fixly-error'}`}>
                              <div className={`w-1 h-1 rounded-full mr-2 ${isValid ? 'bg-fixly-success' : 'bg-fixly-error'}`}></div>
                              {label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                        className="input-field pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-fixly-text-muted hover:text-fixly-text"
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Match Indicator */}
                    {passwordData.confirmPassword && (
                      <div className={`mt-1 text-xs ${
                        passwordData.newPassword === passwordData.confirmPassword
                          ? 'text-fixly-success'
                          : 'text-fixly-error'
                      }`}>
                        {passwordData.newPassword === passwordData.confirmPassword
                          ? '✓ Passwords match'
                          : '✗ Passwords do not match'
                        }
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handlePasswordChange}
                      disabled={passwordLoading || !passwordData.currentPassword || !passwordData.newPassword ||
                               !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword ||
                               !validatePassword(passwordData.newPassword).isValid}
                      className="btn-primary text-sm"
                    >
                      {passwordLoading ? <Loader className="animate-spin h-4 w-4 mr-2" /> : null}
                      {passwordLoading ? 'Sending OTP...' : 'Change Password'}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordChange(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setShowPasswords({ current: false, new: false, confirm: false });
                      }}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ProfileSection>

          {/* Preferences */}
          <ProfileSection title="Notification Preferences" editable={true}>
            {editing ? (
              <div className="space-y-4">
                {Object.entries({
                  emailNotifications: 'Email Notifications',
                  smsNotifications: 'SMS Notifications',
                  jobAlerts: 'Job Alerts',
                  marketingEmails: 'Marketing Emails'
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-fixly-text">{label}</label>
                      <p className="text-sm text-fixly-text-muted">
                        {key === 'emailNotifications' && 'Receive important updates via email'}
                        {key === 'smsNotifications' && 'Receive urgent notifications via SMS'}
                        {key === 'jobAlerts' && 'Get notified about new job opportunities'}
                        {key === 'marketingEmails' && 'Receive promotional emails and updates'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.preferences[key]}
                        onChange={(e) => handleInputChange(`preferences.${key}`, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 bg-fixly-bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fixly-card after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fixly-card after:border-fixly-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fixly-accent`}></div>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries({
                  emailNotifications: 'Email Notifications',
                  smsNotifications: 'SMS Notifications', 
                  jobAlerts: 'Job Alerts',
                  marketingEmails: 'Marketing Emails'
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-fixly-text">{label}</span>
                    <span className={`text-sm ${
                      user.preferences?.[key] ? 'text-fixly-success' : 'text-fixly-text-muted'
                    }`}>
                      {user.preferences?.[key] ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ProfileSection>

          {/* Action Buttons */}
          {editing && (
            <div className="flex space-x-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary flex items-center"
              >
                {loading ? (
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setInitialized(false); // Reset initialization flag
                  // Reset form data will happen via useEffect when initialized becomes false
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OTP Verification Modal for Password Change */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-fixly-card rounded-xl max-w-md w-full p-6"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-fixly-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-fixly-accent" />
              </div>
              <h2 className="text-xl font-bold text-fixly-text mb-2">
                Verify Password Change
              </h2>
              <p className="text-sm text-fixly-text-muted">
                Enter the OTP sent to {user?.email} to confirm your password change
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter OTP"
                  className="input-field text-center text-lg tracking-wider"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowOtpModal(false);
                    setOtp('');
                    setOtpSent(false);
                    setShowPasswordChange(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyOtpAndChangePassword}
                  disabled={otpLoading || otp.length !== 6}
                  className="btn-primary flex-1"
                >
                  {otpLoading ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
                  Change Password
                </button>
              </div>

              {/* Resend OTP */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-fixly-text-muted">
                    Resend OTP in {countdown} seconds
                  </p>
                ) : (
                  <button
                    onClick={resendPasswordOtp}
                    disabled={passwordLoading}
                    className="text-sm text-fixly-accent hover:text-fixly-accent-dark transition-colors"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Enhanced Location Picker Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-fixly-card rounded-xl max-w-2xl w-full mx-4 p-4 md:p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-fixly-text">Select Your Location</h2>
                <p className="text-sm text-fixly-text-muted">
                  Choose your location using GPS or search for an address
                </p>
              </div>
              <button
                onClick={() => setShowLocationPicker(false)}
                className="text-fixly-text-muted hover:text-fixly-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <EnhancedLocationSelector
                onLocationSelect={handleLocationSelect}
                initialLocation={formData.location}
                showLabel={false}
                required={false}
                className="w-full"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-fixly-border">
              <button
                onClick={() => setShowLocationPicker(false)}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Phone Edit Modal */}
      {showPhoneEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-fixly-text">Update Phone Number</h3>
              <button
                onClick={() => {
                  setShowPhoneEdit(false);
                  setNewPhoneNumber('');
                }}
                className="text-fixly-text-muted hover:text-fixly-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">
                  New Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-fixly-text-muted text-sm">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full pl-16 pr-4 py-3 border border-fixly-border rounded-lg focus:ring-2 focus:ring-fixly-accent focus:border-fixly-accent"
                    maxLength={10}
                  />
                </div>
                <p className="text-xs text-fixly-text-muted mt-1">
                  You'll need to verify this number after updating
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-fixly-border">
                <button
                  onClick={() => {
                    setShowPhoneEdit(false);
                    setNewPhoneNumber('');
                  }}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePhoneNumberUpdate}
                  disabled={!newPhoneNumber || newPhoneNumber.length !== 10}
                  className="btn-primary flex-1"
                >
                  Update & Verify
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Phone Verification Modal */}
      {showPhoneVerification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-fixly-text">Verify Phone Number</h3>
              <button
                onClick={() => setShowPhoneVerification(false)}
                className="text-fixly-text-muted hover:text-fixly-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <FirebasePhoneAuth
              phoneNumber={newPhoneNumber || user.phone}
              onVerificationComplete={handlePhoneVerificationComplete}
              onError={handlePhoneVerificationError}
            />
          </motion.div>
        </div>
      )}

      {/* Email Change Modal */}
      {showEmailChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-fixly-card rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-fixly-text">Change Email Address</h2>
                <p className="text-sm text-fixly-text-muted">
                  Enter your new email address to receive a verification code
                </p>
              </div>
              <button
                onClick={handleCancelEmailChange}
                className="text-fixly-text-muted hover:text-fixly-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!emailOtpSent ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Current Email
                  </label>
                  <div className="flex items-center p-3 bg-fixly-bg-secondary rounded-lg">
                    <Mail className="h-4 w-4 text-fixly-text-muted mr-2" />
                    <span className="text-fixly-text">{user.email}</span>
                    <CheckCircle className="h-4 w-4 text-fixly-success ml-2" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    New Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fixly-text-muted" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email address"
                      className="w-full pl-10 pr-4 py-3 bg-fixly-bg border border-fixly-border rounded-xl focus:outline-none focus:ring-2 focus:ring-fixly-primary-light focus:border-fixly-primary transition-all duration-200"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendEmailOtp}
                  disabled={emailChangeLoading || !newEmail.trim()}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {emailChangeLoading ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Verification Code
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-4 bg-fixly-accent/10 rounded-lg">
                  <Mail className="h-8 w-8 text-fixly-accent mx-auto mb-2" />
                  <p className="text-fixly-text font-medium">Verification code sent!</p>
                  <p className="text-sm text-fixly-text-muted">
                    We've sent a 6-digit code to <strong>{newEmail}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-3 bg-fixly-bg border border-fixly-border rounded-xl focus:outline-none focus:ring-2 focus:ring-fixly-primary-light focus:border-fixly-primary transition-all duration-200 text-center tracking-widest font-mono text-lg"
                    maxLength={6}
                  />
                  {emailOtpCountdown > 0 && (
                    <p className="text-sm text-fixly-text-muted mt-2 text-center">
                      Code expires in {Math.floor(emailOtpCountdown / 60)}:{(emailOtpCountdown % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelEmailChange}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyEmailChange}
                    disabled={emailChangeLoading || emailOtp.length !== 6}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {emailChangeLoading ? (
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Verify & Change
                  </button>
                </div>

                {emailOtpCountdown === 0 && (
                  <button
                    onClick={handleSendEmailOtp}
                    disabled={emailChangeLoading}
                    className="w-full btn-outline text-sm"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}