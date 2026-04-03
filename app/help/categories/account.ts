import { Settings } from 'lucide-react';

import type { HelpCategory } from '../help.types';

export const accountSettings: HelpCategory = {
  id: 'account-settings',
  title: 'Account & Settings',
  icon: Settings,
  description: 'Managing your account and preferences',
  articles: [
    {
      id: 'account-management',
      title: 'Managing Your Account',
      content: `
          <h2>Account Settings and Management</h2>
          <p>Learn how to manage your Fixly account settings:</p>

          <h3>Profile Settings</h3>
          <ul>
            <li><strong>Personal Information:</strong> Update name, bio, and contact details</li>
            <li><strong>Profile Photo:</strong> Upload and change your profile picture</li>
            <li><strong>Location:</strong> Update your city and work area</li>
            <li><strong>Skills:</strong> Add or remove skills and certifications</li>
          </ul>

          <h3>Privacy Settings</h3>
          <ul>
            <li><strong>Profile Visibility:</strong> Control who can see your profile</li>
            <li><strong>Contact Information:</strong> Choose what contact info to show</li>
            <li><strong>Activity Status:</strong> Show/hide when you&apos;re online</li>
            <li><strong>Search Visibility:</strong> Appear in search results</li>
          </ul>

          <h3>Notification Preferences</h3>
          <ul>
            <li><strong>Email Notifications:</strong> Choose what emails you receive</li>
            <li><strong>Push Notifications:</strong> Mobile app notification settings</li>
            <li><strong>SMS Alerts:</strong> Text message preferences</li>
            <li><strong>Frequency:</strong> Instant, daily digest, or weekly summary</li>
          </ul>

          <h3>Security Settings</h3>
          <ul>
            <li><strong>Password:</strong> Change your account password</li>
            <li><strong>Two-Factor Authentication:</strong> Enable 2FA for extra security</li>
            <li><strong>Login History:</strong> Review recent account access</li>
            <li><strong>Connected Apps:</strong> Manage third-party integrations</li>
          </ul>

          <h3>Account Deletion</h3>
          <p>If you need to delete your account:</p>
          <ul>
            <li>Complete any ongoing jobs first</li>
            <li>Withdraw any pending earnings</li>
            <li>Cancel active subscriptions</li>
            <li>Contact support for permanent deletion</li>
          </ul>
        `,
    },
  ],
};
