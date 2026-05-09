import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  FileText,
  Scale,
  Shield,
  Users,
} from 'lucide-react';

export const termsSections = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    icon: CheckCircle,
    content: [
      {
        text: 'By accessing and using Fixly, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.',
      },
      {
        text: 'These terms apply to all users of the platform, including hirers (customers seeking services) and fixers (service providers).',
      },
    ],
  },
  {
    id: 'platform-description',
    title: 'Platform Description',
    icon: FileText,
    content: [
      {
        subtitle: 'Service Overview',
        text: 'Fixly is a hyperlocal marketplace platform that connects customers with local service professionals. We facilitate connections but are not directly involved in the actual service provision.',
      },
      {
        subtitle: 'Independent Contractors',
        text: 'Service providers on our platform are independent contractors, not employees of Fixly. We do not control how they perform their services.',
      },
    ],
  },
  {
    id: 'user-responsibilities',
    title: 'User Responsibilities',
    icon: Users,
    content: [
      {
        subtitle: 'Account Information',
        text: 'You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.',
      },
      {
        subtitle: 'Accurate Information',
        text: 'You agree to provide accurate, current, and complete information when creating your profile and posting jobs or applications.',
      },
      {
        subtitle: 'Lawful Use',
        text: 'You agree to use the platform only for lawful purposes and in a way that does not infringe the rights of others or restrict their use of the platform.',
      },
      {
        subtitle: 'Communication',
        text: 'You agree to communicate respectfully with other users and respond promptly to messages related to your jobs or applications.',
      },
      {
        subtitle: 'Location Services',
        text: 'If you choose to enable location services, you consent to the collection and use of your GPS coordinates to provide location-based features. You can disable location sharing at any time through your account settings. Misuse of location data or providing false location information is prohibited.',
      },
    ],
  },
  {
    id: 'service-terms',
    title: 'Service Terms',
    icon: Shield,
    content: [
      {
        subtitle: 'For Hirers (Customers)',
        text: 'You may post one job every 6 hours to maintain platform quality. You are responsible for clearly describing your requirements and providing a safe working environment for service providers.',
      },
      {
        subtitle: 'For Fixers (Service Providers)',
        text: 'Free users get 3 job applications. Pro subscription (₹99/month) provides unlimited applications. You are responsible for delivering services as agreed and maintaining professional standards.',
      },
      {
        subtitle: 'Quality Standards',
        text: 'All users must maintain professional conduct. Fixly reserves the right to remove users who consistently receive poor ratings or violate community standards.',
      },
    ],
  },
  {
    id: 'payment-terms',
    title: 'Payment and Subscription',
    icon: CreditCard,
    content: [
      {
        subtitle: 'Subscription Fees',
        text: 'Pro subscription for fixers costs ₹99/month or ₹999/year. Payments are processed through Razorpay. Subscriptions auto-renew unless cancelled.',
      },
      {
        subtitle: 'Service Payments',
        text: 'Payment for services is made directly between hirers and fixers. Fixly is not responsible for payment disputes between users.',
      },
      {
        subtitle: 'Refunds',
        text: 'Subscription refunds are available within 7 days of purchase. Service payment disputes should be resolved between the parties involved.',
      },
    ],
  },
  {
    id: 'disputes',
    title: 'Disputes and Resolution',
    icon: Scale,
    content: [
      {
        subtitle: 'User Disputes',
        text: 'Disputes between hirers and fixers should first be resolved directly between the parties. If resolution is not possible, users may request Fixly mediation.',
      },
      {
        subtitle: 'Platform Disputes',
        text: 'Any disputes with Fixly should be resolved through arbitration in accordance with Indian law, with jurisdiction in Coimbatore, Tamil Nadu.',
      },
      {
        subtitle: 'Limitation of Liability',
        text: 'Fixly is not liable for damages arising from disputes between users or from services provided through the platform.',
      },
    ],
  },
  {
    id: 'prohibited-activities',
    title: 'Prohibited Activities',
    icon: AlertTriangle,
    content: [
      { text: 'Creating false or misleading profiles or job postings' },
      { text: 'Using the platform for illegal activities or services' },
      { text: 'Harassment, discrimination, or abusive behavior toward other users' },
      { text: 'Attempting to circumvent platform fees or policies' },
      { text: 'Soliciting users to conduct business outside the platform to avoid fees' },
      { text: 'Posting content that violates intellectual property rights' },
    ],
  },
  {
    id: 'termination',
    title: 'Account Termination',
    icon: AlertTriangle,
    content: [
      {
        subtitle: 'User Termination',
        text: 'You may terminate your account at any time by contacting our support team. Upon termination, your access to the platform will be removed.',
      },
      {
        subtitle: 'Platform Termination',
        text: 'Fixly reserves the right to terminate accounts that violate these terms, engage in fraudulent activity, or pose risks to other users.',
      },
      {
        subtitle: 'Effect of Termination',
        text: 'Upon termination, all rights and obligations under these terms cease, except those that by their nature should survive termination.',
      },
    ],
  },
];
