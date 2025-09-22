'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Settings,
  Shield,
  Bell,
  Lock,
  Palette,
  Globe,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  Save,
  Loader,
  Mail,
  Phone,
  MessageSquare,
  ExternalLink,
  Heart,
  Sun,
  Moon,
  Monitor,
  Check
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';
import { toastMessages } from '../../../utils/toast';
import { useTheme } from '../../../contexts/ThemeContext';
import PWAInstallButton from '../../../components/ui/PWAInstallButton';
import PushNotificationManager from '../../../components/ui/PushNotificationManager';

export default function SettingsPage() {
  return (
    <RoleGuard roles={['hirer', 'fixer']} fallback={<div>Access denied</div>}>
      <SettingsContent />
    </RoleGuard>
  );
}

function SettingsContent() {
  const { user } = useApp();
  const { theme, setLightTheme, setDarkTheme, setSystemTheme, isDark, isLight, isSystem } = useTheme();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [badgeStyle, setBadgeStyle] = useState('numbers'); // 'dots' or 'numbers'
  const [compactMode, setCompactMode] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [showUsernameChange, setShowUsernameChange] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Email change states
  const [newEmail, setNewEmail] = useState('');
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState('input'); // 'input', 'verify', 'success'

  // OTP states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpType, setOtpType] = useState(''); // 'username' or 'email'
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Verification states
  const [verificationData, setVerificationData] = useState({
    documentType: '',
    documentFiles: [],
    additionalInfo: ''
  });
  const [uploadingVerification, setUploadingVerification] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Load preferences from cookies on mount
  useEffect(() => {
    const savedBadgeStyle = document.cookie
      .split('; ')
      .find(row => row.startsWith('badgeStyle='))
      ?.split('=')[1] || 'numbers';
    
    const savedCompactMode = document.cookie
      .split('; ')
      .find(row => row.startsWith('compactMode='))
      ?.split('=')[1] === 'true';
    
    const savedAnimations = document.cookie
      .split('; ')
      .find(row => row.startsWith('animationsEnabled='))
      ?.split('=')[1] !== 'false';
    
    const savedAutoRefresh = document.cookie
      .split('; ')
      .find(row => row.startsWith('autoRefresh='))
      ?.split('=')[1] !== 'false';
    
    setBadgeStyle(savedBadgeStyle);
    setCompactMode(savedCompactMode);
    setAnimationsEnabled(savedAnimations);
    setAutoRefresh(savedAutoRefresh);
  }, []);

  // Save badge style to cookies
  const handleBadgeStyleChange = (style) => {
    setBadgeStyle(style);
    document.cookie = `badgeStyle=${style}; path=/; max-age=${365 * 24 * 60 * 60}`; // 1 year
    toast.success('Badge style updated', {
      description: `Now showing ${style} for notifications`
    });
  };

  // Save compact mode to cookies
  const handleCompactModeChange = (enabled) => {
    setCompactMode(enabled);
    document.cookie = `compactMode=${enabled}; path=/; max-age=${365 * 24 * 60 * 60}`; // 1 year
    toast.success(`Compact mode ${enabled ? 'enabled' : 'disabled'}`, {
      description: enabled ? 'Interface will use smaller elements' : 'Interface will use normal spacing'
    });
  };

  // Handle username change - now requires email OTP
  const handleUsernameChange = () => {
    if (!newUsername || newUsername.length < 3) {
      toast.error('Username too short', {
        description: 'Username must be at least 3 characters long'
      });
      return;
    }

    // Check username availability first
    checkUsernameAvailability();
  };

  // Check username availability
  const checkUsernameAvailability = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername })
      });

      const data = await response.json();

      if (data.available) {
        // Username is available, proceed with email OTP
        setOtpType('username');
        setShowOtpModal(true);
        sendOtpForUsernameChange();
      } else {
        toast.error('Username not available', {
          description: data.message || 'Please try a different username'
        });
      }
    } catch (error) {
      toast.error('Failed to check username availability');
    } finally {
      setLoading(false);
    }
  };

  // Send OTP for username change
  const sendOtpForUsernameChange = async () => {
    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          type: 'username_change',
          username: newUsername
        })
      });

      const data = await response.json();

      if (data.success) {
        setOtpSent(true);
        startCountdown();
        toast.success('OTP sent to your email');
      } else {
        toast.error(data.message || 'Failed to send OTP');
        setShowOtpModal(false);
      }
    } catch (error) {
      toast.error('Failed to send OTP');
      setShowOtpModal(false);
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle email change
  const handleEmailChange = () => {
    if (!newEmail || !isValidEmail(newEmail)) {
      toast.error('Invalid email address');
      return;
    }

    if (newEmail === user?.email) {
      toast.error('New email cannot be the same as current email');
      return;
    }

    // Check email availability first
    checkEmailAvailability();
  };

  // Check email availability
  const checkEmailAvailability = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
      });

      const data = await response.json();

      if (data.available) {
        // Email is available, proceed with OTP
        setOtpType('email');
        setShowOtpModal(true);
        sendOtpForEmailChange();
      } else {
        toast.error('Email already in use', {
          description: 'Please use a different email address'
        });
      }
    } catch (error) {
      toast.error('Failed to check email availability');
    } finally {
      setLoading(false);
    }
  };

  // Send OTP for email change
  const sendOtpForEmailChange = async () => {
    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          type: 'email_change',
          currentEmail: user?.email
        })
      });

      const data = await response.json();

      if (data.success) {
        setOtpSent(true);
        startCountdown();
        toast.success(`OTP sent to ${newEmail}`);
      } else {
        toast.error(data.message || 'Failed to send OTP');
        setShowOtpModal(false);
      }
    } catch (error) {
      toast.error('Failed to send OTP');
      setShowOtpModal(false);
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP and complete change
  const verifyOtpAndUpdate = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setOtpLoading(true);
    try {
      const endpoint = otpType === 'username' ? '/api/user/update-username' : '/api/user/update-email';
      const requestBody = otpType === 'username'
        ? { username: newUsername, otp, email: user?.email }
        : { email: newEmail, otp, currentEmail: user?.email };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        if (otpType === 'username') {
          toast.success('Username updated successfully!');
          setShowUsernameChange(false);
          setNewUsername('');
        } else {
          toast.success('Email updated successfully!');
          setShowEmailChange(false);
          setNewEmail('');
        }

        setShowOtpModal(false);
        setOtp('');
        setOtpSent(false);
        // Refresh user data
        window.location.reload();
      } else {
        toast.error(data.message || 'Verification failed');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  // Utility functions
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  const resendOtp = () => {
    if (otpType === 'username') {
      sendOtpForUsernameChange();
    } else {
      sendOtpForEmailChange();
    }
  };

  // Verification functions
  const handleVerificationSubmit = async () => {
    if (!verificationData.documentType || verificationData.documentFiles.length === 0) {
      toast.error('Please select document type and upload at least one document');
      return;
    }

    // Check if user can apply (once every 7 days)
    const lastApplication = user?.verification?.lastApplicationDate;
    if (lastApplication) {
      const daysSinceLastApplication = Math.floor((Date.now() - new Date(lastApplication).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastApplication < 7) {
        toast.error(`You can only apply for verification once every 7 days. Please wait ${7 - daysSinceLastApplication} more days.`);
        return;
      }
    }

    setUploadingVerification(true);
    try {
      const formData = new FormData();
      verificationData.documentFiles.forEach((file, index) => {
        formData.append(`documents`, file);
      });
      formData.append('documentType', verificationData.documentType);
      formData.append('additionalInfo', verificationData.additionalInfo);

      const response = await fetch('/api/user/verification/apply', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Verification documents submitted successfully! We will review them within 3-5 business days.');
        setShowVerificationModal(false);
        setVerificationData({ documentType: '', documentFiles: [], additionalInfo: '' });
        // Refresh user data
        window.location.reload();
      } else {
        toast.error(data.message || 'Failed to submit verification');
      }
    } catch (error) {
      toast.error('Failed to submit verification documents');
    } finally {
      setUploadingVerification(false);
    }
  };

  const handleDocumentUpload = (files) => {
    const validFiles = Array.from(files).filter(file => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB

      if (!isValidType) {
        toast.error(`${file.name}: Only JPG, PNG, and PDF files are allowed`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: File size must be less than 5MB`);
        return false;
      }
      return true;
    });

    if (verificationData.documentFiles.length + validFiles.length > 3) {
      toast.error('Maximum 3 documents allowed');
      return;
    }

    setVerificationData(prev => ({
      ...prev,
      documentFiles: [...prev.documentFiles, ...validFiles]
    }));
  };

  const removeDocument = (index) => {
    setVerificationData(prev => ({
      ...prev,
      documentFiles: prev.documentFiles.filter((_, i) => i !== index)
    }));
  };

  // Handle animations toggle
  const handleAnimationsChange = (enabled) => {
    setAnimationsEnabled(enabled);
    document.cookie = `animationsEnabled=${enabled}; path=/; max-age=${365 * 24 * 60 * 60}`;
    toast.success(`Animations ${enabled ? 'enabled' : 'disabled'}`, {
      description: enabled ? 'Smooth transitions will be shown' : 'Reduced motion for better performance'
    });
    
    // Apply/remove reduced motion class
    if (enabled) {
      document.documentElement.classList.remove('reduce-motion');
    } else {
      document.documentElement.classList.add('reduce-motion');
    }
  };

  // Handle auto-refresh toggle
  const handleAutoRefreshChange = (enabled) => {
    setAutoRefresh(enabled);
    document.cookie = `autoRefresh=${enabled}; path=/; max-age=${365 * 24 * 60 * 60}`;
    toast.success(`Auto-refresh ${enabled ? 'enabled' : 'disabled'}`, {
      description: enabled ? 'Content will update automatically' : 'Manual refresh required for updates'
    });
  };

  const settingSections = [
    {
      id: 'profile',
      title: 'Profile Settings',
      icon: User,
      description: 'Manage your personal information'
    },
    {
      id: 'verification',
      title: 'Account Verification',
      icon: Shield,
      description: 'Verify your identity for trust and safety'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      description: 'Control your notification preferences'
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: Palette,
      description: 'Customize your interface'
    },
    {
      id: 'language',
      title: 'Language & Region',
      icon: Globe,
      description: 'Set your language preferences'
    }
  ];

  if (user?.plan?.type === 'pro') {
    settingSections.push({
      id: 'billing',
      title: 'Billing & Subscription',
      icon: CreditCard,
      description: 'Manage your subscription'
    });
  }

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-fixly-text mb-4">Profile Information</h3>
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Full Name
              </label>
              <input
                type="text"
                defaultValue={user?.name || ''}
                className="input-field"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Email
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="input-field"
                    disabled
                  />
                  <button
                    onClick={() => setShowEmailChange(true)}
                    className="btn-secondary text-sm whitespace-nowrap"
                  >
                    Change
                  </button>
                </div>

                {showEmailChange && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-fixly-text mb-2">Change Email Address</h4>
                    <div className="space-y-3">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value.toLowerCase().trim())}
                        placeholder="Enter new email address"
                        className="input-field text-sm"
                      />
                      <p className="text-xs text-fixly-text-muted">
                        An OTP will be sent to the new email address for verification
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEmailChange}
                          disabled={loading || !newEmail || !isValidEmail(newEmail)}
                          className="btn-primary text-sm"
                        >
                          {loading ? 'Checking...' : 'Send OTP'}
                        </button>
                        <button
                          onClick={() => {
                            setShowEmailChange(false);
                            setNewEmail('');
                          }}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Phone
              </label>
              <input
                type="tel"
                defaultValue={user?.phone || ''}
                className="input-field"
                placeholder="Enter your phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Username
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={user?.username || ''}
                    className="input-field"
                    placeholder="Choose a username"
                    disabled
                  />
                  <button
                    onClick={() => setShowUsernameChange(true)}
                    disabled={user?.usernameChangeCount >= 3}
                    className="btn-secondary text-sm whitespace-nowrap"
                  >
                    Change
                  </button>
                </div>
                <p className="text-xs text-fixly-text-muted">
                  {user?.usernameChangeCount >= 3 
                    ? 'Maximum username changes reached (3/3)' 
                    : `${3 - (user?.usernameChangeCount || 0)} changes remaining`
                  }
                </p>
                
                {showUsernameChange && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-fixly-text mb-2">Change Username</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="Enter new username"
                        className="input-field text-sm"
                        maxLength={20}
                      />
                      <p className="text-xs text-fixly-text-muted">
                        3-20 characters, only lowercase letters, numbers, and underscores
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUsernameChange}
                          disabled={loading || !newUsername || newUsername.length < 3}
                          className="btn-primary text-sm"
                        >
                          {loading ? 'Updating...' : 'Update Username'}
                        </button>
                        <button
                          onClick={() => {
                            setShowUsernameChange(false);
                            setNewUsername('');
                          }}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-fixly-text mb-2">
              Bio
            </label>
            <textarea
              defaultValue={user?.bio || ''}
              className="textarea-field h-24"
              placeholder="Tell us about yourself..."
            />
          </div>
          <div className="mt-6 flex justify-end">
            <button
              disabled={loading}
              className="btn-primary"
            >
              {loading ? <Loader className="animate-spin h-4 w-4 mr-2" /> : null}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVerificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-fixly-text mb-4">Account Verification</h3>
        <div className="card">
          {/* Current Status */}
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 bg-fixly-bg-secondary rounded-lg">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  user?.isVerified
                    ? 'bg-green-500'
                    : user?.verification?.status === 'pending'
                    ? 'bg-yellow-500'
                    : user?.verification?.status === 'rejected'
                    ? 'bg-red-500'
                    : 'bg-gray-400'
                }`}></div>
                <div>
                  <h4 className="font-medium text-fixly-text">Verification Status</h4>
                  <p className="text-sm text-fixly-text-muted">
                    {user?.isVerified
                      ? 'Your account is verified'
                      : user?.verification?.status === 'pending'
                      ? 'Verification pending review'
                      : user?.verification?.status === 'rejected'
                      ? 'Verification rejected'
                      : 'Not verified'
                    }
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user?.isVerified
                    ? 'bg-green-100 text-green-800'
                    : user?.verification?.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : user?.verification?.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {user?.isVerified
                    ? 'Verified'
                    : user?.verification?.status === 'pending'
                    ? 'Pending'
                    : user?.verification?.status === 'rejected'
                    ? 'Rejected'
                    : 'Unverified'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Verification Benefits */}
          <div className="mb-6">
            <h4 className="font-medium text-fixly-text mb-3">Why verify your account?</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Shield className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">Increased Trust</span>
                </div>
                <p className="text-sm text-blue-700">Build confidence with customers through verified identity</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Higher Visibility</span>
                </div>
                <p className="text-sm text-green-700">Verified profiles appear higher in search results</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Star className="h-4 w-4 text-purple-600 mr-2" />
                  <span className="font-medium text-purple-800">Premium Features</span>
                </div>
                <p className="text-sm text-purple-700">Access to exclusive features and opportunities</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Loader className="h-4 w-4 text-orange-600 mr-2" />
                  <span className="font-medium text-orange-800">Faster Support</span>
                </div>
                <p className="text-sm text-orange-700">Priority customer support for verified users</p>
              </div>
            </div>
          </div>

          {/* Last Application Info */}
          {user?.verification?.lastApplicationDate && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Application History</h4>
              <p className="text-sm text-yellow-700">
                Last application: {new Date(user.verification.lastApplicationDate).toLocaleDateString()}
              </p>
              {user?.verification?.rejectionReason && (
                <p className="text-sm text-red-600 mt-1">
                  <strong>Rejection reason:</strong> {user.verification.rejectionReason}
                </p>
              )}
            </div>
          )}

          {/* Apply for Verification */}
          {!user?.isVerified && user?.verification?.status !== 'pending' && (
            <div className="text-center">
              <button
                onClick={() => setShowVerificationModal(true)}
                className="btn-primary"
                disabled={(() => {
                  const lastApplication = user?.verification?.lastApplicationDate;
                  if (!lastApplication) return false;
                  const daysSinceLastApplication = Math.floor((Date.now() - new Date(lastApplication).getTime()) / (1000 * 60 * 60 * 24));
                  return daysSinceLastApplication < 7;
                })()}
              >
                <Shield className="h-4 w-4 mr-2" />
                Apply for Verification
              </button>
              {(() => {
                const lastApplication = user?.verification?.lastApplicationDate;
                if (lastApplication) {
                  const daysSinceLastApplication = Math.floor((Date.now() - new Date(lastApplication).getTime()) / (1000 * 60 * 60 * 24));
                  if (daysSinceLastApplication < 7) {
                    return (
                      <p className="text-sm text-fixly-text-muted mt-2">
                        You can apply again in {7 - daysSinceLastApplication} days
                      </p>
                    );
                  }
                }
                return null;
              })()}
            </div>
          )}

          {user?.verification?.status === 'pending' && (
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 font-medium">Verification documents submitted!</p>
              <p className="text-sm text-blue-600 mt-1">
                We'll review your documents within 3-5 business days and notify you of the result.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      {/* Notification Badge Style */}
      <div>
        <h3 className="text-lg font-semibold text-fixly-text mb-4">Notification Badge Style</h3>
        <div className="card">
          <p className="text-sm text-fixly-text-muted mb-4">
            Choose how notification badges appear in the navigation
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => handleBadgeStyleChange('numbers')}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                badgeStyle === 'numbers' 
                  ? 'border-fixly-accent bg-fixly-accent/5' 
                  : 'border-fixly-border hover:border-fixly-accent/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-fixly-text">Numbers</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">3</span>
                  <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">12</span>
                  {badgeStyle === 'numbers' && <Check className="h-4 w-4 text-fixly-accent" />}
                </div>
              </div>
              <p className="text-sm text-fixly-text-muted">Show actual count of notifications</p>
            </div>
            
            <div 
              onClick={() => handleBadgeStyleChange('dots')}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                badgeStyle === 'dots' 
                  ? 'border-fixly-accent bg-fixly-accent/5' 
                  : 'border-fixly-border hover:border-fixly-accent/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-fixly-text">Dots</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  {badgeStyle === 'dots' && <Check className="h-4 w-4 text-fixly-accent" />}
                </div>
              </div>
              <p className="text-sm text-fixly-text-muted">Show simple dots for any notifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interface Preferences */}
      <div>
        <h3 className="text-lg font-semibold text-fixly-text mb-4">Interface Preferences</h3>
        <div className="card space-y-4">
          <div className="flex items-center justify-between p-4 bg-fixly-bg-secondary rounded-lg">
            <div>
              <h4 className="font-medium text-fixly-text">Compact Mode</h4>
              <p className="text-sm text-fixly-text-muted">Use smaller UI elements and reduced spacing</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => handleCompactModeChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fixly-accent"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div>
        <h3 className="text-lg font-semibold text-fixly-text mb-4">Push Notifications</h3>
        <div className="card">
          <PushNotificationManager />
        </div>
      </div>

      {/* Notification Types */}
      <div>
        <h3 className="text-lg font-semibold text-fixly-text mb-4">Notification Categories</h3>
        <div className="card space-y-4">
          {[
            { key: 'jobNotifications', label: 'Job Updates', desc: 'Applications, status changes, completions' },
            { key: 'messageNotifications', label: 'Messages', desc: 'New messages and replies' },
            { key: 'socialNotifications', label: 'Social', desc: 'Likes, comments, profile views' },
            { key: 'paymentNotifications', label: 'Payments', desc: 'Payment confirmations and failures' },
            { key: 'systemNotifications', label: 'System', desc: 'Account updates and security alerts' },
            { key: 'reviewNotifications', label: 'Reviews', desc: 'New reviews and ratings' }
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between p-4 bg-fixly-bg-secondary rounded-lg">
              <div>
                <h4 className="font-medium text-fixly-text">{setting.label}</h4>
                <p className="text-sm text-fixly-text-muted">{setting.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={user?.preferences?.[setting.key] !== false}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fixly-accent"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSettings();
      case 'verification':
        return renderVerificationSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-fixly-text mb-4">Theme Settings</h3>
              <div className="card">
                <p className="text-sm text-fixly-text-muted mb-6">
                  Choose your preferred appearance. System will automatically match your device settings.
                </p>
                
                <div className="space-y-4">
                  {/* Light Theme */}
                  <div
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isLight && !isSystem
                        ? 'border-fixly-primary bg-fixly-primary-bg'
                        : 'border-fixly-border hover:border-fixly-primary/50'
                    }`}
                    onClick={setLightTheme}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white dark:bg-gray-100 border border-gray-200 rounded-lg">
                          <Sun className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div>
                          <h4 className="font-medium text-fixly-text">Light Mode</h4>
                          <p className="text-sm text-fixly-text-muted">Clean and bright interface</p>
                        </div>
                      </div>
                      {isLight && !isSystem && (
                        <Check className="h-5 w-5 text-fixly-primary" />
                      )}
                    </div>
                    
                    {/* Light Theme Preview */}
                    <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-2 bg-gray-200 rounded w-20"></div>
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 bg-teal-500 rounded-full"></div>
                          <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-100 rounded w-full"></div>
                        <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>

                  {/* Dark Theme */}
                  <div
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isDark && !isSystem
                        ? 'border-fixly-primary bg-fixly-primary-bg'
                        : 'border-fixly-border hover:border-fixly-primary/50'
                    }`}
                    onClick={setDarkTheme}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-800 border border-gray-700 rounded-lg">
                          <Moon className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-fixly-text">Dark Mode</h4>
                          <p className="text-sm text-fixly-text-muted">Elegant dark interface, easy on the eyes</p>
                        </div>
                      </div>
                      {isDark && !isSystem && (
                        <Check className="h-5 w-5 text-fixly-primary" />
                      )}
                    </div>
                    
                    {/* Dark Theme Preview */}
                    <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-2 bg-gray-600 rounded w-20"></div>
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 bg-teal-400 rounded-full"></div>
                          <div className="h-2 w-2 bg-gray-600 rounded-full"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-700 rounded w-full"></div>
                        <div className="h-2 bg-gray-700 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>

                  {/* System Theme */}
                  <div
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isSystem
                        ? 'border-fixly-primary bg-fixly-primary-bg'
                        : 'border-fixly-border hover:border-fixly-primary/50'
                    }`}
                    onClick={setSystemTheme}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-white to-gray-800 border border-gray-300 rounded-lg">
                          <Monitor className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-fixly-text">System (Recommended)</h4>
                          <p className="text-sm text-fixly-text-muted">Automatically matches your device theme</p>
                        </div>
                      </div>
                      {isSystem && (
                        <Check className="h-5 w-5 text-fixly-primary" />
                      )}
                    </div>
                    
                    {/* System Theme Preview */}
                    <div className="mt-4 flex space-x-2">
                      <div className="flex-1 p-2 bg-white border border-gray-200 rounded-lg">
                        <div className="h-2 bg-gray-200 rounded w-full mb-1"></div>
                        <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                      </div>
                      <div className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded-lg">
                        <div className="h-2 bg-gray-600 rounded w-full mb-1"></div>
                        <div className="h-2 bg-gray-700 rounded w-3/4"></div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-fixly-text-muted">
                      <div className="flex items-center space-x-1">
                        <Sun className="h-3 w-3" />
                        <span>Light</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Moon className="h-3 w-3" />
                        <span>Dark</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-fixly-bg-muted rounded-lg">
                  <div className="flex items-start space-x-3">
                    <HelpCircle className="h-5 w-5 text-fixly-accent mt-0.5" />
                    <div>
                      <h5 className="font-medium text-fixly-text mb-1">About Theme Settings</h5>
                      <p className="text-sm text-fixly-text-muted">
                        Your theme preference is saved and will be applied across all your sessions. 
                        System theme automatically switches between light and dark based on your device settings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Appearance Settings */}
            <div>
              <h3 className="text-lg font-semibold text-fixly-text mb-4">Display Options</h3>
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-fixly-text">Compact Mode</h4>
                    <p className="text-sm text-fixly-text-muted">Reduce spacing for more content</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compactMode}
                      onChange={(e) => handleCompactModeChange(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fixly-accent"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-fixly-text">Animations</h4>
                    <p className="text-sm text-fixly-text-muted">Enable smooth transitions and effects</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animationsEnabled}
                      onChange={(e) => handleAnimationsChange(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fixly-accent"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-fixly-text">Auto-refresh</h4>
                    <p className="text-sm text-fixly-text-muted">Automatically refresh content for updates</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => handleAutoRefreshChange(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fixly-accent"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      case 'language':
        return (
          <div className="card">
            <p className="text-fixly-text-muted">Language settings coming soon...</p>
          </div>
        );
      case 'billing':
        return (
          <div className="card">
            <p className="text-fixly-text-muted">
              <a href="/dashboard/subscription" className="text-fixly-primary hover:underline">
                Go to Subscription page
              </a>
            </p>
          </div>
        );
      default:
        return renderProfileSettings();
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fixly-text mb-2">Settings</h1>
        <p className="text-fixly-text-muted">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <nav className="space-y-2">
              {settingSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-center ${
                    activeSection === section.id
                      ? 'bg-fixly-primary-bg text-fixly-primary'
                      : 'hover:bg-fixly-bg-secondary text-fixly-text-secondary'
                  }`}
                >
                  <section.icon className="h-5 w-5 mr-3" />
                  <div className="flex-1">
                    <div className="font-medium">{section.title}</div>
                    <div className="text-xs opacity-75">{section.description}</div>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderSection()}
          </motion.div>
        </div>
      </div>

      {/* Settings Footer */}
      <div className="mt-12 pt-8 border-t border-fixly-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <h4 className="text-lg font-semibold text-fixly-text mb-4">About Fixly</h4>
            <p className="text-fixly-text-muted text-sm mb-4">
              Connecting skilled fixers with customers who need reliable home services. Building trust through quality and professionalism.
            </p>
            <div className="space-y-2">
              <a href="/about" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                About Us
              </a>
              <a href="/how-it-works" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                How It Works
              </a>
              <a href="/safety" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Safety & Trust
              </a>
            </div>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="text-lg font-semibold text-fixly-text mb-4">Contact & Support</h4>
            <div className="space-y-3">
              <a href="mailto:blessancorley@gmail.com" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <Mail className="h-4 w-4 mr-2" />
                blessancorley@gmail.com
              </a>
              <a href="tel:+919976768211" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <Phone className="h-4 w-4 mr-2" />
                +91 9976768211
              </a>
              <a href="https://wa.me/919976768211?text=Hi! I need help with my Fixly account." target="_blank" rel="noopener noreferrer" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp Support
              </a>
              <a href="/support" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help Center
              </a>
              <a href="/contact" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Contact Us
              </a>
            </div>
          </div>

          {/* Legal & Resources */}
          <div>
            <h4 className="text-lg font-semibold text-fixly-text mb-4">Legal & Resources</h4>
            <div className="space-y-2">
              <a href="/terms" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Terms of Service
              </a>
              <a href="/privacy" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Privacy Policy
              </a>
              <a href="/cookies" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Cookie Policy
              </a>
              <a href="/resources" className="flex items-center text-fixly-text-secondary hover:text-fixly-primary transition-colors text-sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Resources
              </a>
              
              {/* PWA Install Option */}
              <div className="pt-2 border-t border-fixly-border mt-4">
                <PWAInstallButton variant="link" className="w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="mt-8 pt-6 border-t border-fixly-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h4 className="text-lg font-semibold text-fixly-text mb-1">Account Actions</h4>
              <p className="text-sm text-fixly-text-muted">
                Manage your account or sign out securely
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to sign out?')) {
                  // Import signOut from next-auth/react at the top level would be better,
                  // but for now we'll use the logout function from the auth context if available
                  window.location.href = '/api/auth/signout';
                }
              }}
              className="flex items-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="mt-8 pt-6 border-t border-fixly-border text-center">
          <div className="flex items-center justify-center mb-2">
            <Heart className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-fixly-text-muted text-sm">
              Made with love by the Fixly team
            </span>
          </div>
          <p className="text-xs text-fixly-text-muted">
            © 2025 Fixly. All rights reserved. Building trust through quality service connections.
          </p>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-fixly-card rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-fixly-text">Apply for Verification</h2>
                <p className="text-sm text-fixly-text-muted">Upload your government ID for account verification</p>
              </div>
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationData({ documentType: '', documentFiles: [], additionalInfo: '' });
                }}
                className="text-fixly-text-muted hover:text-fixly-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Document Type Selection */}
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Document Type *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { value: 'aadhaar', label: 'Aadhaar Card', icon: '🆔' },
                    { value: 'pan', label: 'PAN Card', icon: '💳' },
                    { value: 'driving_license', label: 'Driving License', icon: '🚗' },
                    { value: 'voter_id', label: 'Voter ID', icon: '🗳️' },
                    { value: 'passport', label: 'Passport', icon: '📘' },
                    { value: 'other', label: 'Other Government ID', icon: '📋' }
                  ].map((doc) => (
                    <label
                      key={doc.value}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        verificationData.documentType === doc.value
                          ? 'border-fixly-accent bg-fixly-accent/5'
                          : 'border-fixly-border hover:border-fixly-accent/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="documentType"
                        value={doc.value}
                        checked={verificationData.documentType === doc.value}
                        onChange={(e) => setVerificationData(prev => ({ ...prev, documentType: e.target.value }))}
                        className="sr-only"
                      />
                      <span className="text-2xl mr-3">{doc.icon}</span>
                      <span className="font-medium text-fixly-text">{doc.label}</span>
                      {verificationData.documentType === doc.value && (
                        <Check className="h-4 w-4 text-fixly-accent ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Upload Documents * (Max 3 files, 5MB each)
                </label>
                <div className="border-2 border-dashed border-fixly-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleDocumentUpload(e.target.files)}
                    className="hidden"
                    id="verification-upload"
                  />
                  <label htmlFor="verification-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      <Plus className="h-8 w-8 text-fixly-accent mb-2" />
                      <p className="text-fixly-text font-medium">Click to upload documents</p>
                      <p className="text-sm text-fixly-text-muted">JPG, PNG, or PDF files</p>
                    </div>
                  </label>
                </div>

                {/* Uploaded Files */}
                {verificationData.documentFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {verificationData.documentFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-fixly-bg-secondary rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-fixly-accent/10 rounded flex items-center justify-center mr-3">
                            <span className="text-xs text-fixly-accent">
                              {file.type.includes('pdf') ? 'PDF' : 'IMG'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-fixly-text">{file.name}</p>
                            <p className="text-xs text-fixly-text-muted">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeDocument(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">
                  Additional Information (Optional)
                </label>
                <textarea
                  value={verificationData.additionalInfo}
                  onChange={(e) => setVerificationData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                  placeholder="Any additional information that might help with verification..."
                  className="textarea-field h-20"
                  maxLength={500}
                />
                <p className="text-xs text-fixly-text-muted mt-1">
                  {verificationData.additionalInfo.length}/500 characters
                </p>
              </div>

              {/* Important Notes */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• All documents must be clear and readable</li>
                  <li>• Personal information will be kept confidential</li>
                  <li>• Review typically takes 3-5 business days</li>
                  <li>• You can only apply once every 7 days</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowVerificationModal(false);
                    setVerificationData({ documentType: '', documentFiles: [], additionalInfo: '' });
                  }}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerificationSubmit}
                  disabled={uploadingVerification || !verificationData.documentType || verificationData.documentFiles.length === 0}
                  className="btn-primary flex-1"
                >
                  {uploadingVerification ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  {uploadingVerification ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-fixly-card rounded-xl max-w-md w-full p-6"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-fixly-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-fixly-accent" />
              </div>
              <h2 className="text-xl font-bold text-fixly-text mb-2">
                Verify {otpType === 'username' ? 'Username Change' : 'Email Change'}
              </h2>
              <p className="text-sm text-fixly-text-muted">
                {otpType === 'username'
                  ? `Enter the OTP sent to ${user?.email} to change your username to "${newUsername}"`
                  : `Enter the OTP sent to ${newEmail} to verify your new email address`
                }
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
                    if (otpType === 'username') {
                      setShowUsernameChange(false);
                      setNewUsername('');
                    } else {
                      setShowEmailChange(false);
                      setNewEmail('');
                    }
                  }}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyOtpAndUpdate}
                  disabled={otpLoading || otp.length !== 6}
                  className="btn-primary flex-1"
                >
                  {otpLoading ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
                  Verify & Update
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
                    onClick={resendOtp}
                    disabled={otpLoading}
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
    </div>
  );
}