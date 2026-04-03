'use client';

import { Check } from 'lucide-react';

import type { BadgeStyle, SettingsUser } from '../../../types/settings';
import PushNotificationManager from '../../ui/PushNotificationManager';

export type NotificationPanelProps = {
  user: SettingsUser | null;
  badgeStyle: BadgeStyle;
  onBadgeStyleChange: (style: BadgeStyle) => void;
  compactMode: boolean;
  onCompactModeChange: (enabled: boolean) => void;
};

export function SettingsNotificationPanel({
  user,
  badgeStyle,
  onBadgeStyleChange,
  compactMode,
  onCompactModeChange,
}: NotificationPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Notification Badge Style</h3>
        <div className="card">
          <p className="mb-4 text-sm text-fixly-text-muted">
            Choose how notification badges appear in the navigation
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div
              onClick={() => onBadgeStyleChange('numbers')}
              className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                badgeStyle === 'numbers'
                  ? 'border-fixly-accent bg-fixly-accent/5'
                  : 'border-fixly-border hover:border-fixly-accent/50'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-fixly-text">Numbers</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">3</span>
                  <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">12</span>
                  {badgeStyle === 'numbers' && <Check className="h-4 w-4 text-fixly-accent" />}
                </div>
              </div>
              <p className="text-sm text-fixly-text-muted">Show actual count of notifications</p>
            </div>

            <div
              onClick={() => onBadgeStyleChange('dots')}
              className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                badgeStyle === 'dots'
                  ? 'border-fixly-accent bg-fixly-accent/5'
                  : 'border-fixly-border hover:border-fixly-accent/50'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-fixly-text">Dots</span>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  {badgeStyle === 'dots' && <Check className="h-4 w-4 text-fixly-accent" />}
                </div>
              </div>
              <p className="text-sm text-fixly-text-muted">
                Show simple dots for any notifications
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Interface Preferences</h3>
        <div className="card space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-fixly-bg-secondary p-4">
            <div>
              <h4 className="font-medium text-fixly-text">Compact Mode</h4>
              <p className="text-sm text-fixly-text-muted">
                Use smaller UI elements and reduced spacing
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => onCompactModeChange(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-fixly-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/20"></div>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Push Notifications</h3>
        <div className="card">
          <PushNotificationManager />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Notification Categories</h3>
        <div className="card space-y-4">
          {[
            {
              key: 'jobNotifications',
              label: 'Job Updates',
              desc: 'Applications, status changes, completions',
            },
            { key: 'messageNotifications', label: 'Messages', desc: 'New messages and replies' },
            { key: 'socialNotifications', label: 'Social', desc: 'Likes, comments, profile views' },
            {
              key: 'paymentNotifications',
              label: 'Payments',
              desc: 'Payment confirmations and failures',
            },
            {
              key: 'systemNotifications',
              label: 'System',
              desc: 'Account updates and security alerts',
            },
            { key: 'reviewNotifications', label: 'Reviews', desc: 'New reviews and ratings' },
          ].map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between rounded-lg bg-fixly-bg-secondary p-4"
            >
              <div>
                <h4 className="font-medium text-fixly-text">{setting.label}</h4>
                <p className="text-sm text-fixly-text-muted">{setting.desc}</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  defaultChecked={user?.preferences?.[setting.key] !== false}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-fixly-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/20"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
