import { Clock, Shield, Star, Users } from 'lucide-react';
import type { ElementType } from 'react';

export type FixerPlan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  limitations: string[];
  buttonText: string;
  popular: boolean;
  color: string;
};

export type HirerFeature = {
  icon: ElementType;
  title: string;
  description: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const FIXER_PLANS: FixerPlan[] = [
  {
    name: 'Free Plan',
    price: 'Rs0',
    period: '/month',
    description: 'Perfect for getting started as a service provider',
    features: [
      '3 job applications per month',
      'Basic profile visibility',
      'Customer reviews and ratings',
      'In-app messaging',
      'Basic support',
    ],
    limitations: [
      'Limited to 3 applications',
      'No priority in search results',
      'No advanced analytics',
    ],
    buttonText: 'Get Started Free',
    popular: false,
    color: 'border-fixly-border',
  },
  {
    name: 'Pro Plan',
    price: 'Rs99',
    period: '/month',
    description: 'Unlimited opportunities for serious professionals',
    features: [
      'Unlimited job applications',
      'Priority profile visibility',
      'Advanced portfolio showcase',
      'Priority customer support',
      'Detailed analytics dashboard',
      'Featured in search results',
      'Auto-apply to matching jobs',
      'Monthly performance reports',
    ],
    limitations: [],
    buttonText: 'Upgrade to Pro',
    popular: true,
    color: 'border-fixly-accent',
  },
];

export const HIRER_FEATURES: HirerFeature[] = [
  {
    icon: Users,
    title: 'Unlimited Job Posting',
    description:
      'Post as many jobs as you need with a 6-hour interval between posts to maintain quality',
  },
  {
    icon: Shield,
    title: 'Verified Professionals',
    description:
      'All service providers are background verified for your safety and peace of mind',
  },
  {
    icon: Star,
    title: 'Quality Assurance',
    description: 'Review and rating system ensures you get the best service providers',
  },
  {
    icon: Clock,
    title: 'Quick Response',
    description: 'Get responses from qualified professionals within minutes of posting',
  },
];

export const FAQS: FaqItem[] = [
  {
    question: 'How does the Free Plan work for fixers?',
    answer:
      'Free users get 3 job applications per month. This resets on the 1st of each month. You can upgrade to Pro anytime for unlimited applications.',
  },
  {
    question: 'Is posting jobs really free for hirers?',
    answer:
      'Yes. Hirers can post unlimited jobs for free. We only ask for a 6-hour gap between posts to maintain platform quality.',
  },
  {
    question: 'How do payments work between hirers and fixers?',
    answer:
      'Payments are made directly between hirers and fixers. Fixly does not charge any commission on transactions.',
  },
  {
    question: 'Can I cancel my Pro subscription anytime?',
    answer:
      'Yes, you can cancel your Pro subscription anytime. You will continue to have Pro benefits until the end of your billing period.',
  },
  {
    question: 'Do you offer annual discounts?',
    answer: 'Yes. Annual Pro subscription costs Rs999/year, which saves compared to monthly billing.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit/debit cards, UPI, net banking, and digital wallets through our secure payments integration.',
  },
];
