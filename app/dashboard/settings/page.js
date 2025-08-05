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
  Loader
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';

export default function SettingsPage() {
  return (
    <RoleGuard roles={['hirer', 'fixer']} fallback={<div>Access denied</div>}>
      <SettingsContent />
    </RoleGuard>
  );
}

function SettingsContent() {
  const { user } = useApp();
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
          <div className="card">
            <p className="text-fixly-text-muted">Appearance settings coming soon...</p>
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
    </div>
  );
}