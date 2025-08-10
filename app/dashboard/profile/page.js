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
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../providers';
import { toast } from 'sonner';
import { usePageLoading } from '../../../contexts/LoadingContext';
import { GlobalLoading } from '../../../components/ui/GlobalLoading';
import { searchCities, skillCategories } from '../../../data/cities';

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
  const [customSkill, setCustomSkill] = useState('');

  useEffect(() => {
    if (user) {
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

  const addSkill = useCallback((skill) => {
    if (!formData.skills.includes(skill)) {
      handleInputChange('skills', [...formData.skills, skill]);
    }
  }, [formData.skills, handleInputChange]);

  const removeSkill = useCallback((skillToRemove) => {
    handleInputChange('skills', formData.skills.filter(skill => skill !== skillToRemove));
  }, [formData.skills, handleInputChange]);

  const addCustomSkill = useCallback(() => {
    if (customSkill.trim() && !formData.skills.includes(customSkill.trim())) {
      addSkill(customSkill.trim());
      setCustomSkill('');
    }
  }, [customSkill, formData.skills, addSkill]);

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'profile');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        // Update user photo immediately
        updateUser({ photoURL: data.url });
        toast.success('Profile photo updated');
      } else {
        toast.error(data.message || 'Upload failed');
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
  ));

  if (!user) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="animate-spin h-8 w-8 text-fixly-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fixly-text mb-2">
          My Profile
        </h1>
        <p className="text-fixly-text-light">
          Manage your profile information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Photo & Basic Info */}
        <div className="space-y-6">
          {/* Profile Photo */}
          <ProfileSection title="Profile Photo">
            <div className="text-center">
              <div className="relative inline-block">
                <img
                  src={user.profilePhoto || '/default-avatar.png'}
                  alt={user.name}
                  className="h-24 w-24 rounded-full object-cover mx-auto"
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
              <p className="text-sm text-fixly-text-muted mt-2">
                Click camera to change photo
              </p>
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
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-600 text-sm">Verified</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-orange-500 mr-1" />
                      <span className="text-orange-600 text-sm">Pending</span>
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
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
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
        </div>

        {/* Right Column - Detailed Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <ProfileSection title="Basic Information" editable={true}>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Tell others about yourself..."
                    className="textarea-field h-24"
                    maxLength={500}
                  />
                  <p className="text-xs text-fixly-text-muted mt-1">
                    {formData.bio.length}/500 characters
                  </p>
                </div>
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

                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-fixly-accent mr-3" />
                  <span className="text-fixly-text">{user.email}</span>
                </div>

                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-fixly-accent mr-3" />
                  <span className="text-fixly-text">{user.phone}</span>
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
                        onClick={() => selectCity(city)}
                        className="w-full px-4 py-2 text-left hover:bg-fixly-accent/10"
                      >
                        <div className="font-medium text-fixly-text">{city.name}</div>
                        <div className="text-sm text-fixly-text-light">{city.state}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-fixly-accent mr-3" />
                <span className="text-fixly-text">
                  {user.location ? `${user.location.city}, ${user.location.state}` : 'Not specified'}
                </span>
              </div>
            )}
          </ProfileSection>

          {/* Skills (for fixers) */}
          {user.role === 'fixer' && (
            <ProfileSection title="Skills & Services" editable={true}>
              {editing ? (
                <div className="space-y-4">
                  {/* Selected Skills */}
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
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

                  {/* Add Custom Skill */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      placeholder="Add custom skill"
                      className="input-field flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                    />
                    <button
                      onClick={addCustomSkill}
                      disabled={!customSkill.trim()}
                      className="btn-secondary px-4"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Skill Categories */}
                  <div className="space-y-3">
                    {skillCategories.map((category, categoryIndex) => (
                      <div key={categoryIndex}>
                        <h4 className="font-medium text-fixly-text mb-2 text-sm">
                          {category.category}
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {category.skills.slice(0, 5).map((skill, skillIndex) => (
                            <button
                              key={skillIndex}
                              onClick={() => addSkill(skill)}
                              disabled={formData.skills.includes(skill)}
                              className={`skill-chip text-xs ${
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fixly-accent"></div>
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
                        value={formData.serviceRadius}
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
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          <span className="text-green-600 text-sm">Available Now</span>
                        </>
                      ) : (
                        <span className="text-gray-500 text-sm">Not Available</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </ProfileSection>
          )}

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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fixly-accent"></div>
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
                      user.preferences?.[key] ? 'text-green-600' : 'text-gray-500'
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
                  // Reset form data
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
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}