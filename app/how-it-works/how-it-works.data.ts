import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CheckCircle,
  CreditCard,
  MessageSquare,
  Search,
  Shield,
  Star,
  Upload,
  Users,
} from 'lucide-react';

export type StepItem = {
  step: number;
  title: string;
  description: string;
  details: string[];
  icon: LucideIcon;
};

export type SafetyFeatureItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const customerSteps: StepItem[] = [
  {
    step: 1,
    title: 'Post Your Job',
    description: 'Describe your project with photos and details. Set your budget and preferred timeline.',
    details: [
      'Add photos and detailed description',
      'Set your budget range',
      'Choose preferred timing',
      'Select job category',
    ],
    icon: Upload,
  },
  {
    step: 2,
    title: 'Receive Quotes',
    description: 'Get competitive quotes from verified professionals in your area within hours.',
    details: [
      'Verified fixers apply to your job',
      'Compare profiles and ratings',
      'Review quotes and timelines',
      'Ask questions directly',
    ],
    icon: MessageSquare,
  },
  {
    step: 3,
    title: 'Choose & Schedule',
    description: 'Select the best fixer for your needs and schedule the work at your convenience.',
    details: [
      'Compare fixer profiles',
      'Check reviews and ratings',
      'Schedule convenient time',
      'Confirm job details',
    ],
    icon: Calendar,
  },
  {
    step: 4,
    title: 'Work Completed',
    description: 'Your chosen fixer completes the work professionally and you pay securely.',
    details: [
      'Professional completes work',
      'Inspect and approve results',
      'Secure payment processing',
      'Leave a review',
    ],
    icon: CheckCircle,
  },
];

export const fixerSteps: StepItem[] = [
  {
    step: 1,
    title: 'Create Profile',
    description: 'Build your professional profile with skills, experience, and verification.',
    details: [
      'Complete profile verification',
      'Add skills and certifications',
      'Upload portfolio photos',
      'Set your service areas',
    ],
    icon: Users,
  },
  {
    step: 2,
    title: 'Browse Jobs',
    description: 'Find jobs that match your skills and location preferences.',
    details: [
      'Browse available jobs',
      'Filter by location and skills',
      'View job requirements',
      'Check customer ratings',
    ],
    icon: Search,
  },
  {
    step: 3,
    title: 'Submit Quotes',
    description: 'Send competitive quotes with your timeline and approach.',
    details: [
      'Submit detailed quotes',
      'Explain your approach',
      'Set realistic timelines',
      'Communicate with customers',
    ],
    icon: CreditCard,
  },
  {
    step: 4,
    title: 'Complete Work',
    description: 'Deliver quality work and build your reputation on the platform.',
    details: [
      'Complete work professionally',
      'Maintain communication',
      'Get paid securely',
      'Build 5-star reputation',
    ],
    icon: Star,
  },
];

export const safetyFeatures: SafetyFeatureItem[] = [
  {
    title: 'Background Verification',
    description: 'All fixers undergo comprehensive background checks and identity verification.',
    icon: Shield,
  },
  {
    title: 'Secure Payments',
    description: 'Payments are held securely and released only when work is completed satisfactorily.',
    icon: CreditCard,
  },
  {
    title: 'Review System',
    description: 'Transparent review system helps you make informed decisions about service providers.',
    icon: Star,
  },
  {
    title: 'Customer Support',
    description: '24/7 customer support to help resolve any issues that may arise.',
    icon: MessageSquare,
  },
];
