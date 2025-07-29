'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User,
  Mail,
  Phone,
  Lock,
  Bell,
  Shield,
  CreditCard,
  MapPin,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Camera,
  Edit,
  Check,
  X,
  ChevronRight,
  AlertTriangle,
  Star,
  Settings,
  Download,
  Upload,
  Globe,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Zap,
  Target,
  Award,
  TrendingUp,
  BarChart3,
  Calendar,
  FileText,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../providers';
import { searchCities, skillCategories } from '../../../data/cities';

export default function SettingsPage() {
  const { user, updateUser } = useApp();
  const router = useRouter();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    location: null,
    website: '',
    experience: '',
    profilePhoto: null
  });
  
  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    jobApplications: true,
    jobUpdates: true,
    paymentUpdates: true,
    marketing: false,
    newsletter: true,
    weeklyDigest: true,
    instantAlerts: false
  });
  
  // Fixer-specific settings
  const [fixerSettings, setFixerSettings] = useState({
    availableNow: true,
    serviceRadius: 10,
    hourlyRate: '',
    minimumJobValue: '',
    maximumJobValue: '',
    responseTime: '1', // hours
    workingHours: {
      start: '09:00',
      end: '18:00'
    },
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    skills: [],
    portfolio: [],
    autoApply: false,
    emergencyAvailable: false
  });

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showPhone: true,
    showEmail: false,
    showLocation: true,
    showRating: true,
    allowReviews: true,
    allowMessages: true,
    dataSharingConsent: false
  });

  // App preferences
  const [appPreferences, setAppPreferences] = useState({
    theme: 'light',
    language: 'en',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    mapProvider: 'google',
    defaultView: 'list'
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Load user data
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || null,
        website: user.website || '',
        experience: user.experience || '',
        profilePhoto: user.profilePhoto || null
      });
      
      setNotifications({
        emailNotifications: user.preferences?.emailNotifications ?? true,
        smsNotifications: user.preferences?.smsNotifications ?? false,
        pushNotifications: user.preferences?.pushNotifications ?? true,
        jobApplications: user.preferences?.jobApplications ?? true,
        jobUpdates: user.preferences?.jobUpdates ?? true,
        paymentUpdates: user.preferences?.paymentUpdates ?? true,
        marketing: user.preferences?.marketing ?? false,
        newsletter: user.preferences?.newsletter ?? true,
        weeklyDigest: user.preferences?.weeklyDigest ?? true,
        instantAlerts: user.preferences?.instantAlerts ?? false
      });
      
      if (user.role === 'fixer') {
        setFixerSettings({
          availableNow: user.availableNow ?? true,
          serviceRadius: user.serviceRadius ?? 10,
          hourlyRate: user.hourlyRate || '',
          minimumJobValue: user.minimumJobValue || '',
          maximumJobValue: user.maximumJobValue || '',
          responseTime: user.responseTime || '1',
          workingHours: user.workingHours || { start: '09:00', end: '18:00' },
          workingDays: user.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          skills: user.skills || [],
          portfolio: user.portfolio || [],
          autoApply: user.autoApply ?? false,
          emergencyAvailable: user.emergencyAvailable ?? false
        });
      }

      setPrivacySettings({
        profileVisibility: user.privacy?.profileVisibility || 'public',
        showPhone: user.privacy?.showPhone ?? true,
        showEmail: user.privacy?.showEmail ?? false,
        showLocation: user.privacy?.showLocation ?? true,
        showRating: user.privacy?.showRating ?? true,
        allowReviews: user.privacy?.allowReviews ?? true,
        allowMessages: user.privacy?.allowMessages ?? true,
        dataSharingConsent: user.privacy?.dataSharingConsent ?? false
      });

      setAppPreferences({
        theme: user.preferences?.theme || 'light',
        language: user.preferences?.language || 'en',
        currency: user.preferences?.currency || 'INR',
        timezone: user.preferences?.timezone || 'Asia/Kolkata',
        mapProvider: user.preferences?.mapProvider || 'google',
        defaultView: user.preferences?.defaultView || 'list'
      });
    }
  }, [user]);

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

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Profile updated successfully');
        updateUser(data.user);
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password changed successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/user/upload-photo', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setProfileData(prev => ({ ...prev, profilePhoto: data.photoUrl }));
        toast.success('Photo uploaded successfully');
      } else {
        toast.error(data.message || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addSkill = (skill) => {
    if (!fixerSettings.skills.includes(skill)) {
      setFixerSettings(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
  };

  const removeSkill = (skillToRemove) => {
    setFixerSettings(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: notifications })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Notification preferences saved');
        updateUser(data.user);
      } else {
        toast.error(data.message || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Preferences save error:', error);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFixerSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/fixer-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fixerSettings)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Fixer settings saved');
        updateUser(data.user);
      } else {
        toast.error(data.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Fixer settings save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy: privacySettings })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Privacy settings saved');
        updateUser(data.user);
      } else {
        toast.error(data.message || 'Failed to save privacy settings');
      }
    } catch (error) {
      console.error('Privacy settings save error:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User, desc: 'Personal information and bio' },
    { id: 'security', name: 'Security', icon: Shield, desc: 'Password and account security' },
    { id: 'notifications', name: 'Notifications', icon: Bell, desc: 'Email, SMS and push notifications' },
    ...(user?.role === 'fixer' ? [{ id: 'fixer', name: 'Fixer Settings', icon: Star, desc: 'Availability and pricing' }] : []),
    { id: 'privacy', name: 'Privacy', icon: Lock, desc: 'Profile visibility and data sharing' },
    { id: 'preferences', name: 'Preferences', icon: Settings, desc: 'App theme and language' },
    { id: 'plan', name: 'Plan & Billing', icon: CreditCard, desc: 'Subscription and payments' }
  ];

  const renderProfileTab = () => (
    <div className="space-y-8">
      {/* Profile Photo Section */}
      <div className="border-b border-fixly-border pb-8">
        <h3 className="text-xl font-semibold text-fixly-text mb-6">Profile Photo</h3>
        
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-fixly-border flex items-center justify-center overflow-hidden">
              {profileData.profilePhoto ? (
                <img 
                  src={profileData.profilePhoto} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-fixly-text-muted" />
              )}
            </div>
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <label className="btn-primary cursor-pointer inline-flex items-center">
              <Camera className="h-4 w-4 mr-2" />
              {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </label>
            <p className="text-sm text-fixly-text-muted mt-2">
              JPG, PNG or GIF. Max size 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div>
        <h3 className="text-xl font-semibold text-fixly-text mb-6">Personal Information</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-fixly-text mb-3">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                className="input-field pl-10 text-lg py-3"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fixly-text mb-3">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                className="input-field pl-10 text-lg py-3"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fixly-text mb-3">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                className="input-field pl-10 text-lg py-3"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-fixly-text mb-3">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <input
                type="text"
                value={profileData.location ? profileData.location.name : citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value);
                  if (profileData.location) {
                    setProfileData(prev => ({ ...prev, location: null }));
                  }
                }}
                placeholder="Search for your city"
                className="input-field pl-10 text-lg py-3"
              />
            </div>
            
            {showCityDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-fixly-card border border-fixly-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {cityResults.map((city, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setProfileData(prev => ({ ...prev, location: city }));
                      setShowCityDropdown(false);
                      setCitySearch('');
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-fixly-accent/10"
                  >
                    <div className="font-medium text-fixly-text">{city.name}</div>
                    <div className="text-sm text-fixly-text-light">{city.state}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-fixly-text mb-3">
              Website (Optional)
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <input
                type="url"
                value={profileData.website}
                onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                className="input-field pl-10 text-lg py-3"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fixly-text mb-3">
              Years of Experience
            </label>
            <div className="relative">
              <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <select
                value={profileData.experience}
                onChange={(e) => setProfileData(prev => ({ ...prev, experience: e.target.value }))}
                className="select-field pl-10 text-lg py-3"
              >
                <option value="">Select experience</option>
                <option value="0-1">0-1 years</option>
                <option value="1-3">1-3 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-fixly-text mb-3">
            Bio
          </label>
          <textarea
            value={profileData.bio}
            onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
            rows={4}
            className="textarea-field text-lg"
            placeholder="Tell us about yourself, your experience, and what makes you unique..."
            maxLength={500}
          />
          <p className="text-sm text-fixly-text-muted mt-2">
            {profileData.bio.length}/500 characters
          </p>
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="btn-primary px-8 py-3 text-lg flex items-center"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 mr-3 border-2 border-fixly-text border-t-transparent rounded-full" />
            ) : (
              <Save className="h-5 w-5 mr-3" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-fixly-text mb-2">Account Security</h3>
        <p className="text-fixly-text-muted mb-8">
          Keep your account secure by using a strong password and enabling two-factor authentication.
        </p>
        
        {/* Password Change Section */}
        <div className="card mb-8">
          <h4 className="text-lg font-medium text-fixly-text mb-6">Change Password</h4>
          
          <div className="space-y-6 max-w-md">
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-3">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                <input
                  type={showPassword.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="input-field pl-10 pr-10 text-lg py-3"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword.current ? (
                    <EyeOff className="h-5 w-5 text-fixly-text-muted" />
                  ) : (
                    <Eye className="h-5 w-5 text-fixly-text-muted" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fixly-text mb-3">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                <input
                  type={showPassword.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="input-field pl-10 pr-10 text-lg py-3"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword.new ? (
                    <EyeOff className="h-5 w-5 text-fixly-text-muted" />
                  ) : (
                    <Eye className="h-5 w-5 text-fixly-text-muted" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fixly-text mb-3">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                <input
                  type={showPassword.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="input-field pl-10 pr-10 text-lg py-3"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword.confirm ? (
                    <EyeOff className="h-5 w-5 text-fixly-text-muted" />
                  ) : (
                    <Eye className="h-5 w-5 text-fixly-text-muted" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
              className="btn-primary px-6 py-3 text-lg flex items-center"
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 mr-3 border-2 border-fixly-text border-t-transparent rounded-full" />
              ) : (
                <Save className="h-5 w-5 mr-3" />
              )}
              Change Password
            </button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-medium text-fixly-text">Two-Factor Authentication</h4>
              <p className="text-sm text-fixly-text-muted mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
            <button className="btn-secondary">
              Enable 2FA
            </button>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Two-factor authentication is not enabled
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Enable 2FA to secure your account with an additional verification step.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-fixly-text mb-2">Notification Preferences</h3>
        <p className="text-fixly-text-muted mb-8">
          Choose how and when you want to receive notifications about your account activity.
        </p>
        
        <div className="space-y-6">
          {/* Communication Methods */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Communication Methods</h4>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Email Notifications</span>
                    <p className="text-sm text-fixly-text-muted">Receive notifications via email</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.emailNotifications}
                  onChange={(e) => setNotifications(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">SMS Notifications</span>
                    <p className="text-sm text-fixly-text-muted">Receive notifications via SMS</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.smsNotifications}
                  onChange={(e) => setNotifications(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <Smartphone className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Push Notifications</span>
                    <p className="text-sm text-fixly-text-muted">Receive push notifications on your device</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.pushNotifications}
                  onChange={(e) => setNotifications(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>
            </div>
          </div>

          {/* Job Notifications */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Job Updates</h4>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <Target className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Job Applications</span>
                    <p className="text-sm text-fixly-text-muted">Get notified about new applications</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.jobApplications}
                  onChange={(e) => setNotifications(prev => ({ ...prev, jobApplications: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Job Status Updates</span>
                    <p className="text-sm text-fixly-text-muted">Get notified when job status changes</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.jobUpdates}
                  onChange={(e) => setNotifications(prev => ({ ...prev, jobUpdates: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <Zap className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Instant Alerts</span>
                    <p className="text-sm text-fixly-text-muted">Get immediate notifications for urgent updates</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.instantAlerts}
                  onChange={(e) => setNotifications(prev => ({ ...prev, instantAlerts: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>
            </div>
          </div>

          {/* Payment & Billing */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Payment & Billing</h4>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Payment Updates</span>
                    <p className="text-sm text-fixly-text-muted">Get notified about payments and transactions</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.paymentUpdates}
                  onChange={(e) => setNotifications(prev => ({ ...prev, paymentUpdates: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>
            </div>
          </div>

          {/* Marketing & Newsletter */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Marketing & Newsletter</h4>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Marketing Emails</span>
                    <p className="text-sm text-fixly-text-muted">Receive promotional offers and updates</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.marketing}
                  onChange={(e) => setNotifications(prev => ({ ...prev, marketing: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Newsletter</span>
                    <p className="text-sm text-fixly-text-muted">Weekly newsletter with tips and updates</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.newsletter}
                  onChange={(e) => setNotifications(prev => ({ ...prev, newsletter: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Weekly Digest</span>
                    <p className="text-sm text-fixly-text-muted">Weekly summary of your activity</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.weeklyDigest}
                  onChange={(e) => setNotifications(prev => ({ ...prev, weeklyDigest: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={handleSaveNotifications}
            disabled={loading}
            className="btn-primary px-8 py-3 text-lg flex items-center"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 mr-3 border-2 border-fixly-text border-t-transparent rounded-full" />
            ) : (
              <Save className="h-5 w-5 mr-3" />
            )}
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );

  const renderFixerTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-fixly-text mb-2">Fixer Settings</h3>
        <p className="text-fixly-text-muted mb-8">
          Configure your availability, pricing, and work preferences to attract the right clients.
        </p>
        
        <div className="space-y-8">
          {/* Availability Settings */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Availability</h4>
            
            <div className="space-y-6">
              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div>
                  <span className="font-medium text-fixly-text">Available Now</span>
                  <p className="text-sm text-fixly-text-muted">Show as available for immediate jobs</p>
                </div>
                <input
                  type="checkbox"
                  checked={fixerSettings.availableNow}
                  onChange={(e) => setFixerSettings(prev => ({ ...prev, availableNow: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div>
                  <span className="font-medium text-fixly-text">Emergency Available</span>
                  <p className="text-sm text-fixly-text-muted">Available for emergency calls outside working hours</p>
                </div>
                <input
                  type="checkbox"
                  checked={fixerSettings.emergencyAvailable}
                  onChange={(e) => setFixerSettings(prev => ({ ...prev, emergencyAvailable: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Service Radius (km)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={fixerSettings.serviceRadius}
                    onChange={(e) => setFixerSettings(prev => ({ ...prev, serviceRadius: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-fixly-text-muted mt-2">
                    <span>1 km</span>
                    <span className="font-medium text-fixly-accent">{fixerSettings.serviceRadius} km</span>
                    <span>50 km</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Average Response Time
                </label>
                <select
                  value={fixerSettings.responseTime}
                  onChange={(e) => setFixerSettings(prev => ({ ...prev, responseTime: e.target.value }))}
                  className="select-field text-lg py-3"
                >
                  <option value="0.5">Within 30 minutes</option>
                  <option value="1">Within 1 hour</option>
                  <option value="2">Within 2 hours</option>
                  <option value="4">Within 4 hours</option>
                  <option value="8">Within 8 hours</option>
                  <option value="24">Within 24 hours</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing Settings */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Pricing</h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Hourly Rate (₹)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                  <input
                    type="number"
                    value={fixerSettings.hourlyRate}
                    onChange={(e) => setFixerSettings(prev => ({ ...prev, hourlyRate: e.target.value }))}
                    className="input-field pl-10 text-lg py-3"
                    placeholder="e.g., 500"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Minimum Job Value (₹)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                  <input
                    type="number"
                    value={fixerSettings.minimumJobValue}
                    onChange={(e) => setFixerSettings(prev => ({ ...prev, minimumJobValue: e.target.value }))}
                    className="input-field pl-10 text-lg py-3"
                    placeholder="e.g., 200"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Maximum Job Value (₹)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                  <input
                    type="number"
                    value={fixerSettings.maximumJobValue}
                    onChange={(e) => setFixerSettings(prev => ({ ...prev, maximumJobValue: e.target.value }))}
                    className="input-field pl-10 text-lg py-3"
                    placeholder="e.g., 10000"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Skills & Services</h4>
            
            {/* Selected Skills */}
            {fixerSettings.skills.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-fixly-text mb-3">Selected Skills</label>
                <div className="flex flex-wrap gap-2">
                  {fixerSettings.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="skill-chip skill-chip-selected text-base px-4 py-2"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-2 hover:text-fixly-text"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skill Categories */}
            <div className="space-y-6">
              {skillCategories.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h5 className="font-medium text-fixly-text mb-3">{category.category}</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {category.skills.map((skill, skillIndex) => (
                      <button
                        key={skillIndex}
                        onClick={() => addSkill(skill)}
                        disabled={fixerSettings.skills.includes(skill)}
                        className={`skill-chip text-sm ${
                          fixerSettings.skills.includes(skill)
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
          </div>

          {/* Working Hours */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Working Hours</h4>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-3">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                    <input
                      type="time"
                      value={fixerSettings.workingHours.start}
                      onChange={(e) => setFixerSettings(prev => ({ 
                        ...prev, 
                        workingHours: { ...prev.workingHours, start: e.target.value }
                      }))}
                      className="input-field pl-10 text-lg py-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-3">
                    End Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                    <input
                      type="time"
                      value={fixerSettings.workingHours.end}
                      onChange={(e) => setFixerSettings(prev => ({ 
                        ...prev, 
                        workingHours: { ...prev.workingHours, end: e.target.value }
                      }))}
                      className="input-field pl-10 text-lg py-3"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Working Days
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { key: 'monday', label: 'Monday' },
                    { key: 'tuesday', label: 'Tuesday' },
                    { key: 'wednesday', label: 'Wednesday' },
                    { key: 'thursday', label: 'Thursday' },
                    { key: 'friday', label: 'Friday' },
                    { key: 'saturday', label: 'Saturday' },
                    { key: 'sunday', label: 'Sunday' }
                  ].map(day => (
                    <label key={day.key} className="flex flex-col items-center p-3 border border-fixly-border rounded-lg hover:bg-fixly-accent/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fixerSettings.workingDays.includes(day.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFixerSettings(prev => ({ 
                              ...prev, 
                              workingDays: [...prev.workingDays, day.key]
                            }));
                          } else {
                            setFixerSettings(prev => ({ 
                              ...prev, 
                              workingDays: prev.workingDays.filter(d => d !== day.key)
                            }));
                          }
                        }}
                        className="mb-2 h-4 w-4 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                      />
                      <span className="text-sm text-fixly-text text-center">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Apply Settings */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Automation</h4>
            
            <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
              <div>
                <span className="font-medium text-fixly-text">Auto-Apply to Jobs</span>
                <p className="text-sm text-fixly-text-muted">Automatically apply to jobs matching your skills and preferences</p>
              </div>
              <input
                type="checkbox"
                checked={fixerSettings.autoApply}
                onChange={(e) => setFixerSettings(prev => ({ ...prev, autoApply: e.target.checked }))}
                className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={handleSaveFixerSettings}
            disabled={loading}
            className="btn-primary px-8 py-3 text-lg flex items-center"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 mr-3 border-2 border-fixly-text border-t-transparent rounded-full" />
            ) : (
              <Save className="h-5 w-5 mr-3" />
            )}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-fixly-text mb-2">Privacy Settings</h3>
        <p className="text-fixly-text-muted mb-8">
          Control your privacy and what information is visible to others on the platform.
        </p>
        
        <div className="space-y-6">
          {/* Profile Visibility */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Profile Visibility</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Who can see your profile?
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="profileVisibility"
                      value="public"
                      checked={privacySettings.profileVisibility === 'public'}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, profileVisibility: e.target.value }))}
                      className="mr-3 h-4 w-4 text-fixly-accent border-fixly-border focus:ring-fixly-accent"
                    />
                    <div>
                      <span className="font-medium text-fixly-text">Public</span>
                      <p className="text-sm text-fixly-text-muted">Anyone can see your profile</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="profileVisibility"
                      value="verified"
                      checked={privacySettings.profileVisibility === 'verified'}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, profileVisibility: e.target.value }))}
                      className="mr-3 h-4 w-4 text-fixly-accent border-fixly-border focus:ring-fixly-accent"
                    />
                    <div>
                      <span className="font-medium text-fixly-text">Verified Users Only</span>
                      <p className="text-sm text-fixly-text-muted">Only verified users can see your profile</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="profileVisibility"
                      value="private"
                      checked={privacySettings.profileVisibility === 'private'}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, profileVisibility: e.target.value }))}
                      className="mr-3 h-4 w-4 text-fixly-accent border-fixly-border focus:ring-fixly-accent"
                    />
                    <div>
                      <span className="font-medium text-fixly-text">Private</span>
                      <p className="text-sm text-fixly-text-muted">Only you can see your profile</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Contact Information</h4>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Show Phone Number</span>
                    <p className="text-sm text-fixly-text-muted">Allow others to see your phone number</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.showPhone}
                  onChange={(e) => setPrivacySettings(prev => ({ ...prev, showPhone: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Show Email Address</span>
                    <p className="text-sm text-fixly-text-muted">Allow others to see your email address</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.showEmail}
                  onChange={(e) => setPrivacySettings(prev => ({ ...prev, showEmail: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Show Location</span>
                    <p className="text-sm text-fixly-text-muted">Show your city and area to potential clients</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.showLocation}
                  onChange={(e) => setPrivacySettings(prev => ({ ...prev, showLocation: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>
            </div>
          </div>

          {/* Reviews & Ratings */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Reviews & Interactions</h4>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Show Rating</span>
                    <p className="text-sm text-fixly-text-muted">Display your rating on your profile</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.showRating}
                  onChange={(e) => setPrivacySettings(prev => ({ ...prev, showRating: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Allow Reviews</span>
                    <p className="text-sm text-fixly-text-muted">Let clients leave reviews on your profile</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.allowReviews}
                  onChange={(e) => setPrivacySettings(prev => ({ ...prev, allowReviews: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Allow Direct Messages</span>
                    <p className="text-sm text-fixly-text-muted">Let other users send you direct messages</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.allowMessages}
                  onChange={(e) => setPrivacySettings(prev => ({ ...prev, allowMessages: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>
            </div>
          </div>

          {/* Data & Analytics */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Data & Analytics</h4>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5">
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 text-fixly-accent mr-3" />
                  <div>
                    <span className="font-medium text-fixly-text">Data Sharing Consent</span>
                    <p className="text-sm text-fixly-text-muted">Allow us to share anonymized data for research</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.dataSharingConsent}
                  onChange={(e) => setPrivacySettings(prev => ({ ...prev, dataSharingConsent: e.target.checked }))}
                  className="h-5 w-5 text-fixly-accent border-fixly-border rounded focus:ring-fixly-accent"
                />
              </label>
            </div>
          </div>

          {/* Account Deletion */}
          <div className="card border-red-200">
            <h4 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <span className="font-medium text-red-800">Delete Account</span>
                  <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                </div>
                <button className="btn-secondary text-red-600 border-red-300 hover:bg-red-100">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={handleSavePrivacy}
            disabled={loading}
            className="btn-primary px-8 py-3 text-lg flex items-center"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 mr-3 border-2 border-fixly-text border-t-transparent rounded-full" />
            ) : (
              <Save className="h-5 w-5 mr-3" />
            )}
            Save Privacy Settings
          </button>
        </div>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-fixly-text mb-2">App Preferences</h3>
        <p className="text-fixly-text-muted mb-8">
          Customize your app experience with themes, language, and display preferences.
        </p>
        
        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Appearance</h4>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex flex-col items-center p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={appPreferences.theme === 'light'}
                      onChange={(e) => setAppPreferences(prev => ({ ...prev, theme: e.target.value }))}
                      className="mb-2 h-4 w-4 text-fixly-accent border-fixly-border focus:ring-fixly-accent"
                    />
                    <Sun className="h-8 w-8 text-yellow-500 mb-2" />
                    <span className="text-sm font-medium text-fixly-text">Light</span>
                  </label>
                  
                  <label className="flex flex-col items-center p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={appPreferences.theme === 'dark'}
                      onChange={(e) => setAppPreferences(prev => ({ ...prev, theme: e.target.value }))}
                      className="mb-2 h-4 w-4 text-fixly-accent border-fixly-border focus:ring-fixly-accent"
                    />
                    <Moon className="h-8 w-8 text-blue-500 mb-2" />
                    <span className="text-sm font-medium text-fixly-text">Dark</span>
                  </label>
                  
                  <label className="flex flex-col items-center p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value="auto"
                      checked={appPreferences.theme === 'auto'}
                      onChange={(e) => setAppPreferences(prev => ({ ...prev, theme: e.target.value }))}
                      className="mb-2 h-4 w-4 text-fixly-accent border-fixly-border focus:ring-fixly-accent"
                    />
                    <Monitor className="h-8 w-8 text-gray-500 mb-2" />
                    <span className="text-sm font-medium text-fixly-text">Auto</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Language & Region */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Language & Region</h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Language
                </label>
                <select
                  value={appPreferences.language}
                  onChange={(e) => setAppPreferences(prev => ({ ...prev, language: e.target.value }))}
                  className="select-field text-lg py-3"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Currency
                </label>
                <select
                  value={appPreferences.currency}
                  onChange={(e) => setAppPreferences(prev => ({ ...prev, currency: e.target.value }))}
                  className="select-field text-lg py-3"
                >
                  <option value="INR">₹ Indian Rupee (INR)</option>
                  <option value="USD">$ US Dollar (USD)</option>
                  <option value="EUR">€ Euro (EUR)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Timezone
                </label>
                <select
                  value={appPreferences.timezone}
                  onChange={(e) => setAppPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                  className="select-field text-lg py-3"
                >
                  <option value="Asia/Kolkata">India Standard Time (IST)</option>
                  <option value="Asia/Dubai">UAE Time (GST)</option>
                  <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                  <option value="America/New_York">Eastern Time (EST)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-3">
                  Map Provider
                </label>
                <select
                  value={appPreferences.mapProvider}
                  onChange={(e) => setAppPreferences(prev => ({ ...prev, mapProvider: e.target.value }))}
                  className="select-field text-lg py-3"
                >
                  <option value="google">Google Maps</option>
                  <option value="mapbox">Mapbox</option>
                  <option value="openstreet">OpenStreetMap</option>
                </select>
              </div>
            </div>
          </div>

          {/* Display Preferences */}
          <div className="card">
            <h4 className="text-lg font-medium text-fixly-text mb-6">Display Preferences</h4>
            
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-3">
                Default View for Job Listings
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5 cursor-pointer">
                  <input
                    type="radio"
                    name="defaultView"
                    value="list"
                    checked={appPreferences.defaultView === 'list'}
                    onChange={(e) => setAppPreferences(prev => ({ ...prev, defaultView: e.target.value }))}
                    className="mr-3 h-4 w-4 text-fixly-accent border-fixly-border focus:ring-fixly-accent"
                  />
                  <div>
                    <span className="font-medium text-fixly-text">List View</span>
                    <p className="text-sm text-fixly-text-muted">Detailed list format</p>
                  </div>
                </label>
                
                <label className="flex items-center p-4 border border-fixly-border rounded-lg hover:bg-fixly-accent/5 cursor-pointer">
                  <input
                    type="radio"
                    name="defaultView"
                    value="grid"
                    checked={appPreferences.defaultView === 'grid'}
                    onChange={(e) => setAppPreferences(prev => ({ ...prev, defaultView: e.target.value }))}
                    className="mr-3 h-4 w-4 text-fixly-accent border-fixly-border focus:ring-fixly-accent"
                  />
                  <div>
                    <span className="font-medium text-fixly-text">Grid View</span>
                    <p className="text-sm text-fixly-text-muted">Card-based grid format</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button
            disabled={loading}
            className="btn-primary px-8 py-3 text-lg flex items-center"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 mr-3 border-2 border-fixly-text border-t-transparent rounded-full" />
            ) : (
              <Save className="h-5 w-5 mr-3" />
            )}
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );

  const renderPlanTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-fixly-text mb-2">Plan & Billing</h3>
        <p className="text-fixly-text-muted mb-8">
          Manage your subscription, billing information, and usage statistics.
        </p>
        
        {/* Current Plan */}
        <div className="card border-fixly-accent mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-xl font-medium text-fixly-text">Current Plan</h4>
              <p className="text-fixly-text-muted">
                {user?.plan?.type === 'pro' ? 'Professional Plan' : 'Free Plan'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-fixly-accent">
                {user?.plan?.type === 'pro' ? '₹99' : '₹0'}
              </span>
              <p className="text-sm text-fixly-text-muted">/month</p>
            </div>
          </div>

          {/* Plan Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-fixly-text mb-3">Current Features</h5>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-fixly-text">
                    {user?.role === 'fixer' ? '3 job applications' : 'Unlimited job postings'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-fixly-text">Basic support</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-fixly-text">Standard visibility</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-fixly-text mb-3">Usage This Month</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-fixly-text-muted">Jobs {user?.role === 'fixer' ? 'Applied' : 'Posted'}</span>
                  <span className="text-sm font-medium text-fixly-text">
                    {user?.plan?.creditsUsed || 0}/{user?.plan?.type === 'pro' ? '∞' : '3'}
                  </span>
                </div>
                <div className="w-full bg-fixly-border rounded-full h-2">
                  <div 
                    className="bg-fixly-accent h-2 rounded-full" 
                    style={{ 
                      width: user?.plan?.type === 'pro' ? '0%' : `${Math.min(((user?.plan?.creditsUsed || 0) / 3) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Section */}
        {user?.plan?.type === 'free' && (
          <div className="card border-fixly-accent">
            <div className="text-center mb-6">
              <h4 className="text-xl font-medium text-fixly-text mb-2">Upgrade to Pro</h4>
              <p className="text-fixly-text-muted">
                Unlock unlimited access and premium features
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h5 className="font-medium text-fixly-text mb-4">Free Plan</h5>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-fixly-text">
                      {user?.role === 'fixer' ? '3 job applications/month' : '1 job posting every 6 hours'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-fixly-text">Basic support</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-fixly-text">Standard profile visibility</span>
                  </div>
                </div>
              </div>

              <div className="bg-fixly-accent/10 p-6 rounded-lg">
                <h5 className="font-medium text-fixly-text mb-4 flex items-center">
                  Pro Plan
                  <span className="ml-2 px-2 py-1 bg-fixly-accent text-fixly-text text-xs rounded-full">
                    Recommended
                  </span>
                </h5>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-fixly-text">
                      {user?.role === 'fixer' ? 'Unlimited job applications' : 'Unlimited job postings'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-fixly-text">Priority support</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-fixly-text">Featured profile & listings</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-fixly-text">Advanced analytics</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-fixly-text">Portfolio showcase</span>
                  </div>
                  {user?.role === 'fixer' && (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-fixly-text">Auto-apply to matching jobs</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push('/dashboard/subscription')}
                className="btn-primary px-8 py-3 text-lg"
              >
                Upgrade to Pro - ₹99/month
              </button>
              <p className="text-xs text-fixly-text-muted mt-2">
                Cancel anytime • 7-day free trial
              </p>
            </div>
          </div>
        )}

        {/* Billing History */}
        {user?.plan?.type === 'pro' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-medium text-fixly-text">Billing History</h4>
              <button className="btn-secondary flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Download All
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-fixly-border rounded-lg">
                <div>
                  <span className="font-medium text-fixly-text">Pro Plan - January 2024</span>
                  <p className="text-sm text-fixly-text-muted">Paid on Jan 1, 2024</p>
                </div>
                <div className="text-right">
                  <span className="font-medium text-fixly-text">₹99.00</span>
                  <p className="text-sm text-green-600">Paid</p>
                </div>
              </div>

              <div className="text-center py-8 text-fixly-text-muted">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No previous billing history</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'security':
        return renderSecurityTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'fixer':
        return renderFixerTab();
      case 'privacy':
        return renderPrivacyTab();
      case 'preferences':
        return renderPreferencesTab();
      case 'plan':
        return renderPlanTab();
      default:
        return renderProfileTab();
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-fixly-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fixly-text mb-3">Settings</h1>
        <p className="text-fixly-text-light text-lg">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Sidebar */}
        <div className="xl:w-80">
          <div className="card p-0 sticky top-6">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-6 py-4 text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-fixly-accent/10 text-fixly-text border-r-4 border-fixly-accent'
                        : 'text-fixly-text-muted hover:bg-fixly-accent/5 hover:text-fixly-text'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-4" />
                    <div className="flex-1">
                      <div className="font-medium">{tab.name}</div>
                      <div className="text-xs text-fixly-text-muted mt-1">{tab.desc}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="card"
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}