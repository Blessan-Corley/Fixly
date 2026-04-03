import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Eye,
  FileText,
  MessageSquare,
  Shield,
  Star,
  UserCheck,
} from 'lucide-react';

export const safetyFeatures = [
  {
    title: 'Identity Verification',
    description:
      'All service providers undergo comprehensive identity verification including government ID checks and address verification.',
    icon: UserCheck,
    features: [
      'Government ID verification',
      'Address confirmation',
      'Phone number validation',
      'Social media profile checks',
    ],
  },
  {
    title: 'Background Checks',
    description:
      'Professional background screening ensures only trustworthy individuals join our platform.',
    icon: FileText,
    features: [
      'Criminal background checks',
      'Professional reference verification',
      'Previous work history review',
      'Skill and certification validation',
    ],
  },
  {
    title: 'Secure Payments',
    description:
      'Advanced payment protection keeps your money safe until work is completed to your satisfaction.',
    icon: CreditCard,
    features: [
      'Escrow payment system',
      'Secure payment processing',
      'Money-back guarantee',
      'Dispute resolution support',
    ],
  },
  {
    title: 'Real-time Monitoring',
    description:
      'Our advanced monitoring systems track all platform activity to ensure user safety.',
    icon: Eye,
    features: [
      '24/7 platform monitoring',
      'Suspicious activity detection',
      'Automated fraud prevention',
      'Real-time safety alerts',
    ],
  },
];

export const safetyTips = [
  {
    title: 'Before Hiring',
    icon: CheckCircle,
    tips: [
      'Check fixer profiles and ratings thoroughly',
      'Read reviews from previous customers',
      'Verify licenses and certifications if required',
      'Communicate through the platform initially',
      'Get detailed quotes in writing',
    ],
  },
  {
    title: 'During the Job',
    icon: Eye,
    tips: [
      'Be present when work is being performed',
      'Take photos of work progress',
      'Communicate any concerns immediately',
      'Ensure proper safety equipment is used',
      'Keep valuables secure',
    ],
  },
  {
    title: 'After Completion',
    icon: Star,
    tips: [
      'Inspect work thoroughly before approval',
      'Test all completed work',
      'Take photos of completed work',
      'Leave honest reviews',
      'Report any issues promptly',
    ],
  },
];

export const emergencyProcedures = [
  {
    title: 'Immediate Safety Concerns',
    description: 'If you feel unsafe or notice dangerous work practices',
    steps: [
      'Stop the work immediately',
      'Remove yourself from the area if necessary',
      "Contact emergency services if there's immediate danger",
      'Report the incident to Fixly support',
      'Document the situation with photos if safe to do so',
    ],
    icon: AlertTriangle,
    color: 'bg-red-500',
  },
  {
    title: 'Dispute Resolution',
    description: 'When work quality or payment issues arise',
    steps: [
      'Try to resolve directly with the service provider',
      'Document all communications and issues',
      'Contact Fixly support within 48 hours',
      'Provide evidence (photos, messages, receipts)',
      'Follow our mediation process',
    ],
    icon: MessageSquare,
    color: 'bg-orange-500',
  },
  {
    title: 'Reporting Fraud',
    description: 'If you suspect fraudulent activity',
    steps: [
      'Do not share personal or financial information',
      'Screenshot suspicious messages or profiles',
      'Report immediately to Fixly support',
      'Contact your bank if payments were involved',
      'File a police report if necessary',
    ],
    icon: Shield,
    color: 'bg-fixly-primary',
  },
];

export const insuranceInfo = {
  title: 'Insurance & Protection',
  description: 'Comprehensive coverage for peace of mind',
  coverage: [
    {
      type: 'General Liability',
      description: 'Covers property damage and personal injury during service delivery',
      amount: 'Up to $1M per incident',
    },
    {
      type: 'Work Quality Guarantee',
      description: 'Protection against substandard work completion',
      amount: 'Up to job value',
    },
    {
      type: 'Payment Protection',
      description: 'Secure escrow system protects customer payments',
      amount: 'Full payment amount',
    },
  ],
};
