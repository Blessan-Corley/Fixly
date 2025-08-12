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
  ExternalLink,
  Heart,
  Sun,
  Moon,
  Monitor,
  Check
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';
import { useTheme } from '../../../contexts/ThemeContext';

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

  const settingSections = [
    {
      id: 'profile',
      title: 'Profile Settings',
      icon: User,
      description: 'Manage your personal information'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      description: 'Control your notification preferences'
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: Shield,
      description: 'Manage your privacy settings'
    },
    {
      id: 'password',
      title: 'Password',
      icon: Lock,
      description: 'Change your password'
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
              <input
                type="email"
                defaultValue={user?.email || ''}
                className="input-field"
                disabled
              />
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
              <input
                type="text"
                defaultValue={user?.username || ''}
                className="input-field"
                placeholder="Choose a username"
              />
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

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-fixly-text mb-4">Notification Preferences</h3>
        <div className="card space-y-4">
          {[
            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via email' },
            { key: 'pushNotifications', label: 'Push Notifications', desc: 'Get browser notifications' },
            { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Receive text messages' },
            { key: 'jobAlerts', label: 'Job Alerts', desc: 'New job opportunities' },
            { key: 'marketing', label: 'Marketing Emails', desc: 'Promotional content' }
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fixly-primary"></div>
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
      case 'notifications':
        return renderNotificationSettings();
      case 'privacy':
        return (
          <div className="card">
            <p className="text-fixly-text-muted">Privacy settings coming soon...</p>
          </div>
        );
      case 'password':
        return (
          <div className="card">
            <p className="text-fixly-text-muted">Password change coming soon...</p>
          </div>
        );
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
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-fixly-primary focus:ring-offset-2">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 shadow-lg transition-transform"></span>
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-fixly-text">Animations</h4>
                    <p className="text-sm text-fixly-text-muted">Enable smooth transitions and effects</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-fixly-primary transition-colors focus:outline-none focus:ring-2 focus:ring-fixly-primary focus:ring-offset-2">
                    <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white dark:bg-gray-100 shadow-lg transition-transform"></span>
                  </button>
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
            </div>
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
    </div>
  );
}