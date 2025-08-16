// components/settings/PrivacyControls.js
'use client';

import { useState, useEffect } from 'react';
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

export default function PrivacyControls({ user, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public', // public, private, verified_only
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
    allowAnalytics: true
  });

  useEffect(() => {
    if (user?.privacySettings) {
      setPrivacySettings({ ...privacySettings, ...user.privacySettings });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacySettings })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Privacy settings updated successfully');
        onUpdate?.(data.user);
      } else {
        toast.error(data.message || 'Failed to update privacy settings');
      }
    } catch (error) {
      console.error('Privacy settings update error:', error);
      toast.error('Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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