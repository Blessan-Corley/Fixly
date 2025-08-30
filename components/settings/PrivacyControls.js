// components/settings/PrivacyControls.js
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MapPin,
  User,
  Save,
  Loader,
  AlertTriangle,
  Info,
  Lock,
  Globe,
  Users,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

// Performance optimization: Memoize animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// Memoized icon components to prevent re-renders
const IconComponents = {
  Globe,
  Shield, 
  Lock,
  EyeOff,
  Phone,
  Mail,
  MapPin,
  User,
  Users
};

export default function PrivacyControls({ user, onUpdate }) {
  const [loading, setLoading] = useState(false);
  
  // Memoized initial privacy settings to prevent recreation on every render
  const initialPrivacySettings = useMemo(() => ({
    profileVisibility: 'public',
    showPhone: false,
    showEmail: false,
    showFullAddress: false,
    showRating: true,
    showJobHistory: true,
    showTotalSpent: false,
    showJoinDate: true,
    allowMessagesFromAll: true,
    allowMessagesFromVerifiedOnly: false,
    showLastActive: true,
    hideFromSearch: false,
    shareDataWithPartners: false,
    allowAnalytics: true,
    enableLocationServices: true,
    showApproximateLocation: true,
    allowBackgroundLocationUpdates: false,
    shareLocationForJobMatching: true,
    allowLocationAnalytics: true
  }), []);
  
  const [privacySettings, setPrivacySettings] = useState(initialPrivacySettings);

  // Optimized effect with proper dependency management
  useEffect(() => {
    if (user?.privacySettings) {
      setPrivacySettings(prev => ({ ...prev, ...user.privacySettings }));
    }
  }, [user?.privacySettings]); // More specific dependency

  // Optimized save handler with error handling
  const handleSave = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacySettings }),
        // Performance: abort previous requests if user clicks save rapidly
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Privacy settings updated successfully');
        onUpdate?.(data.user);
      } else {
        toast.error(data.message || 'Failed to update privacy settings');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Privacy settings update error:', error);
        toast.error('Failed to update privacy settings');
      }
    } finally {
      setLoading(false);
    }
  }, [privacySettings, onUpdate]);

  const privacyOptions = [
    {
      category: 'Profile Visibility',
      description: 'Control who can see your profile and information',
      settings: [
        {
          key: 'profileVisibility',
          title: 'Profile Visibility',
          description: 'Who can view your complete profile',
          type: 'select',
          options: [
            { value: 'public', label: 'Public (Everyone)', icon: Globe },
            { value: 'verified_only', label: 'Verified Users Only', icon: Shield },
            { value: 'private', label: 'Private (Hidden)', icon: Lock }
          ],
          icon: User
        },
        {
          key: 'hideFromSearch',
          title: 'Hide from Search Results',
          description: 'Prevent your profile from appearing in search results',
          type: 'toggle',
          icon: EyeOff
        }
      ]
    },
    {
      category: 'Contact Information',
      description: 'Control what contact details are visible to others',
      settings: [
        {
          key: 'showPhone',
          title: 'Show Phone Number',
          description: 'Display your phone number on your profile',
          type: 'toggle',
          icon: Phone,
          warning: 'Only share with trusted clients'
        },
        {
          key: 'showEmail',
          title: 'Show Email Address',
          description: 'Display your email address on your profile',
          type: 'toggle',
          icon: Mail,
          warning: 'Recommended to keep private'
        },
        {
          key: 'showFullAddress',
          title: 'Show Full Address',
          description: 'Display your complete address instead of just city',
          type: 'toggle',
          icon: MapPin,
          warning: 'Not recommended for safety reasons'
        }
      ]
    },
    {
      category: 'Profile Information',
      description: 'Control what information appears on your profile',
      settings: [
        {
          key: 'showRating',
          title: 'Show Rating & Reviews',
          description: 'Display your rating and review count',
          type: 'toggle',
          icon: User
        },
        {
          key: 'showJobHistory',
          title: 'Show Job History',
          description: 'Display your completed jobs and work history',
          type: 'toggle',
          icon: User
        },
        {
          key: 'showTotalSpent',
          title: 'Show Total Spent (Hirers)',
          description: 'Display total amount spent on platform',
          type: 'toggle',
          icon: User,
          roleSpecific: ['hirer']
        },
        {
          key: 'showJoinDate',
          title: 'Show Join Date',
          description: 'Display when you joined the platform',
          type: 'toggle',
          icon: User
        },
        {
          key: 'showLastActive',
          title: 'Show Last Active',
          description: 'Display when you were last online',
          type: 'toggle',
          icon: User
        }
      ]
    },
    {
      category: 'Communication',
      description: 'Control who can contact you and how',
      settings: [
        {
          key: 'allowMessagesFromAll',
          title: 'Allow Messages from All Users',
          description: 'Anyone can send you messages',
          type: 'toggle',
          icon: Users
        },
        {
          key: 'allowMessagesFromVerifiedOnly',
          title: 'Verified Users Only',
          description: 'Only verified users can message you',
          type: 'toggle',
          icon: Shield
        }
      ]
    },
    {
      category: 'Location & Privacy',
      description: 'Control how we use your location to help you find nearby opportunities',
      settings: [
        {
          key: 'enableLocationServices',
          title: 'Enable Location Services 📍',
          description: 'Allow Fixly to use your location to show you nearby jobs and opportunities',
          type: 'toggle',
          icon: MapPin,
          positive: true
        },
        {
          key: 'shareLocationForJobMatching',
          title: 'Smart Job Matching 🎯',
          description: 'Use your location to prioritize jobs that are convenient for you',
          type: 'toggle',
          icon: MapPin,
          positive: true
        },
        {
          key: 'showApproximateLocation',
          title: 'Show City/Area on Profile 🏠',
          description: 'Display your general area (not exact address) to help clients find local fixers',
          type: 'toggle',
          icon: MapPin
        },
        {
          key: 'allowBackgroundLocationUpdates',
          title: 'Background Location Updates 🔄',
          description: 'Keep your location updated automatically for the best job matching experience',
          type: 'toggle',
          icon: MapPin
        },
        {
          key: 'allowLocationAnalytics',
          title: 'Location Insights 📊',
          description: 'Help us understand job market trends in your area (anonymous data only)',
          type: 'toggle',
          icon: MapPin
        }
      ]
    },
    {
      category: 'Data & Analytics',
      description: 'Control how your data is used',
      settings: [
        {
          key: 'shareDataWithPartners',
          title: 'Share Data with Partners',
          description: 'Allow anonymized data sharing for platform improvement',
          type: 'toggle',
          icon: Settings
        },
        {
          key: 'allowAnalytics',
          title: 'Usage Analytics',
          description: 'Help improve the platform with usage analytics',
          type: 'toggle',
          icon: Settings
        }
      ]
    }
  ];

  const handleSettingChange = (key, value) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: value
    }));

    // Handle dependent settings
    if (key === 'allowMessagesFromVerifiedOnly' && value) {
      setPrivacySettings(prev => ({
        ...prev,
        allowMessagesFromAll: false
      }));
    } else if (key === 'allowMessagesFromAll' && value) {
      setPrivacySettings(prev => ({
        ...prev,
        allowMessagesFromVerifiedOnly: false
      }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-fixly-text">Privacy Controls</h2>
          <p className="text-fixly-text-muted">Manage who can see your information and how you can be contacted</p>
        </div>
      </div>

      {/* Privacy Status Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
      >
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-1" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Your Privacy Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Profile: </span>
                <span className="text-blue-600">
                  {privacySettings.profileVisibility === 'public' ? 'Public' :
                   privacySettings.profileVisibility === 'verified_only' ? 'Verified Only' : 'Private'}
                </span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Contact Info: </span>
                <span className="text-blue-600">
                  {(privacySettings.showPhone || privacySettings.showEmail) ? 'Partially Visible' : 'Hidden'}
                </span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Location: </span>
                <span className="text-blue-600">
                  {privacySettings.enableLocationServices ? 
                    (privacySettings.shareLocationForJobMatching ? 'Smart Matching On' : 'Basic Only') : 'Disabled'}
                </span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Messages: </span>
                <span className="text-blue-600">
                  {privacySettings.allowMessagesFromAll ? 'All Users' : 
                   privacySettings.allowMessagesFromVerifiedOnly ? 'Verified Only' : 'Restricted'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Privacy Settings */}
      {privacyOptions.map((category, categoryIndex) => (
        <motion.div
          key={category.category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: categoryIndex * 0.1 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-fixly-text mb-2">{category.category}</h3>
          <p className="text-fixly-text-muted mb-6">{category.description}</p>

          <div className="space-y-6">
            {category.settings
              .filter(setting => !setting.roleSpecific || setting.roleSpecific.includes(user?.role))
              .map((setting) => {
                const IconComponent = setting.icon;
                return (
                  <div key={setting.key} className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mt-1">
                        <IconComponent className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-fixly-text">{setting.title}</h4>
                        <p className="text-sm text-fixly-text-muted mt-1">{setting.description}</p>
                        {setting.warning && (
                          <div className="flex items-center gap-1 mt-2">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span className="text-xs text-amber-600">{setting.warning}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      {setting.type === 'toggle' ? (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacySettings[setting.key]}
                            onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      ) : setting.type === 'select' ? (
                        <select
                          value={privacySettings[setting.key]}
                          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                          className="select-field min-w-[150px]"
                        >
                          {setting.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  </div>
                );
              })}
          </div>
        </motion.div>
      ))}

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-end"
      >
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Privacy Settings
        </button>
      </motion.div>
    </div>
  );
}