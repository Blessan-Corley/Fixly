import {
  BookOpen,
  CreditCard,
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  Settings,
  Shield,
  Users,
} from 'lucide-react';

export const supportOptions = [
  {
    title: 'Live Chat',
    description: 'Get instant help from our support team',
    availability: 'Available 24/7',
    icon: MessageSquare,
    color: 'bg-green-500',
    action: 'Start Chat',
    phone: undefined as string | undefined,
    email: undefined as string | undefined,
  },
  {
    title: 'Phone Support',
    description: 'Speak directly with a support specialist',
    availability: 'Mon-Fri, 9 AM - 8 PM EST',
    icon: Phone,
    color: 'bg-blue-500',
    action: 'Call Now',
    phone: '1-800-FIXLY-HELP' as string | undefined,
    email: undefined as string | undefined,
  },
  {
    title: 'Email Support',
    description: 'Send us a detailed message about your issue',
    availability: 'Response within 24 hours',
    icon: Mail,
    color: 'bg-fixly-primary',
    action: 'Send Email',
    phone: undefined as string | undefined,
    email: 'blessancorley@gmail.com' as string | undefined,
  },
];

export const faqCategories = [
  { id: 'all', name: 'All Topics', icon: HelpCircle },
  { id: 'getting-started', name: 'Getting Started', icon: BookOpen },
  { id: 'account', name: 'Account & Profile', icon: Users },
  { id: 'payments', name: 'Payments & Billing', icon: CreditCard },
  { id: 'safety', name: 'Safety & Security', icon: Shield },
  { id: 'technical', name: 'Technical Issues', icon: Settings },
];

export const faqs = [
  {
    category: 'getting-started',
    question: 'How do I create an account on Fixly?',
    answer:
      "Creating an account is simple! Click \"Get Started\" on our homepage, choose whether you're a customer or service provider, and follow the signup process. You'll need to verify your email and complete your profile to get started.",
  },
  {
    category: 'getting-started',
    question: 'How do I post my first job?',
    answer:
      'After creating your account, go to your dashboard and click "Post a Job". Provide a detailed description, add photos if helpful, set your budget, and choose your preferred timeline. Your job will be visible to verified service providers in your area.',
  },
  {
    category: 'account',
    question: 'How do I update my profile information?',
    answer:
      'Log into your account and go to "Profile" in your dashboard. From there, you can update your contact information, profile photo, bio, skills (for fixers), and other details. Make sure to save your changes.',
  },
  {
    category: 'account',
    question: 'How do I verify my account?',
    answer:
      'Account verification involves confirming your email, phone number, and identity. For service providers, we also require background checks and skill verification. Check your dashboard for verification status and next steps.',
  },
  {
    category: 'payments',
    question: 'How does payment work on Fixly?',
    answer:
      'We use a secure escrow system. Customers pay upfront, and funds are held safely until the job is completed to satisfaction. Service providers receive payment after job completion and customer approval.',
  },
  {
    category: 'payments',
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards, debit cards, PayPal, and bank transfers. All payments are processed securely through our encrypted payment system.',
  },
  {
    category: 'safety',
    question: 'How do you verify service providers?',
    answer:
      'All service providers undergo comprehensive background checks, identity verification, and skill assessment. We verify licenses where required and continuously monitor platform activity for safety.',
  },
  {
    category: 'safety',
    question: "What if I'm not satisfied with the work?",
    answer:
      "We offer a satisfaction guarantee. If you're not happy with the work, contact our support team within 48 hours. We'll work with both parties to resolve the issue, and you may be eligible for a refund.",
  },
  {
    category: 'technical',
    question: "I'm having trouble uploading photos",
    answer:
      'Make sure your photos are in JPG, PNG, or GIF format and under 10MB each. Try clearing your browser cache or using a different browser. If issues persist, contact our technical support team.',
  },
  {
    category: 'technical',
    question: 'The website is loading slowly',
    answer:
      'Slow loading can be due to internet connection, browser issues, or temporary server load. Try refreshing the page, clearing your browser cache, or switching to a different browser. Contact support if problems continue.',
  },
];
