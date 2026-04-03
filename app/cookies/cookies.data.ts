import { BarChart3, Globe, Lock, Settings, Users } from 'lucide-react';
import type { ElementType } from 'react';

export type CookieType = {
  title: string;
  description: string;
  icon: ElementType;
  examples: string[];
};

export type ThirdPartyService = {
  name: string;
  purpose: string;
  type: string;
};

export const COOKIE_TYPES: CookieType[] = [
  {
    title: 'Essential Cookies',
    description: 'These cookies are necessary for the website to function and cannot be switched off.',
    icon: Lock,
    examples: [
      'Authentication and login status',
      'Security and fraud prevention',
      'Shopping cart and order processing',
      'Form submission and data validation',
    ],
  },
  {
    title: 'Analytics Cookies',
    description: 'These cookies help us understand how visitors use our website.',
    icon: BarChart3,
    examples: [
      'Page views and user interactions',
      'Traffic sources and referrals',
      'Performance and loading times',
      'Popular content and features',
    ],
  },
  {
    title: 'Preference Cookies',
    description: 'These cookies remember your choices and personalize your experience.',
    icon: Settings,
    examples: [
      'Language and region preferences',
      'Display settings and themes',
      'Notification preferences',
      'Location sharing preferences',
      'Saved searches and favorites',
    ],
  },
  {
    title: 'Location Cookies',
    description: 'These cookies store your location preferences and GPS coordinates when enabled.',
    icon: Globe,
    examples: [
      'GPS coordinates for nearby job matching',
      'Location sharing preferences (enabled/disabled)',
      'City and state information',
      'Travel distance preferences',
      'Last known location timestamp',
    ],
  },
  {
    title: 'Social Media Cookies',
    description: 'These cookies enable social media features and content sharing.',
    icon: Users,
    examples: [
      'Social media login integration',
      'Content sharing buttons',
      'Social media feeds and widgets',
      'Profile synchronization',
    ],
  },
];

export const THIRD_PARTY_SERVICES: ThirdPartyService[] = [
  { name: 'Google Analytics', purpose: 'Website analytics and performance tracking', type: 'Analytics' },
  { name: 'Google Ads', purpose: 'Advertising and conversion tracking', type: 'Marketing' },
  { name: 'Facebook Pixel', purpose: 'Social media integration and advertising', type: 'Social & Marketing' },
  { name: 'NextAuth.js', purpose: 'User authentication and session management', type: 'Essential' },
];
