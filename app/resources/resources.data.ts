import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  CreditCard,
  Download,
  FileText,
  MessageSquare,
  Shield,
  Star,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';

export const resourceCategories = [
  {
    title: 'Getting Started',
    description: 'Essential guides for new fixers',
    icon: BookOpen,
    color: 'bg-blue-500',
    resources: [
      {
        title: 'Fixer Onboarding Guide',
        type: 'PDF Guide',
        description: 'Complete guide to setting up your profile and getting your first job',
        downloadUrl: '#',
        icon: FileText,
      },
      {
        title: 'Profile Optimization Video',
        type: 'Video Tutorial',
        description: 'Learn how to create a compelling profile that attracts customers',
        downloadUrl: '#',
        icon: Video,
      },
      {
        title: 'Pricing Strategy Worksheet',
        type: 'Worksheet',
        description: 'Tools to help you set competitive and profitable prices',
        downloadUrl: '#',
        icon: Download,
      },
    ],
  },
  {
    title: 'Business Growth',
    description: 'Tools to expand your service business',
    icon: TrendingUp,
    color: 'bg-green-500',
    resources: [
      {
        title: 'Marketing Your Services',
        type: 'Guide',
        description: 'Strategies to promote your services and build your reputation',
        downloadUrl: '#',
        icon: FileText,
      },
      {
        title: 'Customer Communication Best Practices',
        type: 'Template Pack',
        description: 'Templates for professional communication with customers',
        downloadUrl: '#',
        icon: MessageSquare,
      },
      {
        title: 'Seasonal Business Planning',
        type: 'Worksheet',
        description: 'Plan your business around seasonal demand patterns',
        downloadUrl: '#',
        icon: Download,
      },
    ],
  },
  {
    title: 'Safety & Compliance',
    description: 'Stay safe and compliant on every job',
    icon: Shield,
    color: 'bg-red-500',
    resources: [
      {
        title: 'Safety Checklist',
        type: 'Checklist',
        description: 'Comprehensive safety checklist for different job types',
        downloadUrl: '#',
        icon: CheckCircle,
      },
      {
        title: 'Insurance Requirements Guide',
        type: 'Guide',
        description: 'Understanding insurance requirements for service providers',
        downloadUrl: '#',
        icon: FileText,
      },
      {
        title: 'Emergency Procedures',
        type: 'Quick Reference',
        description: 'What to do in case of accidents or emergencies',
        downloadUrl: '#',
        icon: AlertCircle,
      },
    ],
  },
  {
    title: 'Financial Management',
    description: 'Manage your finances like a pro',
    icon: CreditCard,
    color: 'bg-fixly-primary',
    resources: [
      {
        title: 'Tax Guide for Service Providers',
        type: 'Guide',
        description: 'Understanding tax obligations and deductions',
        downloadUrl: '#',
        icon: FileText,
      },
      {
        title: 'Expense Tracking Template',
        type: 'Spreadsheet',
        description: 'Track your business expenses and income',
        downloadUrl: '#',
        icon: Download,
      },
      {
        title: 'Invoice Templates',
        type: 'Template Pack',
        description: 'Professional invoice templates for your business',
        downloadUrl: '#',
        icon: FileText,
      },
    ],
  },
];

export const webinars = [
  {
    title: 'Mastering Customer Service Excellence',
    date: 'June 15, 2025',
    time: '2:00 PM EST',
    description: 'Learn how to exceed customer expectations and build lasting relationships',
    status: 'upcoming',
    registrationUrl: '#',
  },
  {
    title: 'Pricing Strategies That Win Jobs',
    date: 'June 8, 2025',
    time: '3:00 PM EST',
    description: 'Advanced pricing techniques to maximize your earnings',
    status: 'upcoming',
    registrationUrl: '#',
  },
  {
    title: 'Building Your Brand on Fixly',
    date: 'May 25, 2025',
    time: '1:00 PM EST',
    description: 'Create a strong personal brand that attracts premium customers',
    status: 'recorded',
    registrationUrl: '#',
  },
];

export const communityResources = [
  {
    title: 'Fixer Community Forum',
    description: 'Connect with other service providers, share tips, and get advice',
    icon: Users,
    link: '#',
  },
  {
    title: 'Success Stories',
    description: 'Read inspiring stories from successful fixers on our platform',
    icon: Star,
    link: '#',
  },
  {
    title: 'Best Practices Blog',
    description: 'Weekly articles on business tips, industry trends, and more',
    icon: BookOpen,
    link: '#',
  },
  {
    title: 'Live Chat Support',
    description: '24/7 support for technical issues and platform questions',
    icon: MessageSquare,
    link: '#',
  },
];
