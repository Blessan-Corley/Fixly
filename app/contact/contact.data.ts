import {
  AlertCircle,
  Clock,
  Headphones,
  HelpCircle,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Users,
} from 'lucide-react';
import type { ElementType } from 'react';

export type ContactMethod = {
  icon: ElementType;
  title: string;
  description: string;
  value: string;
  action: string | null;
  primary: boolean;
};

export type SupportCategory = {
  icon: ElementType;
  title: string;
  description: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const contactMethods: ContactMethod[] = [
  {
    icon: Mail,
    title: 'Email Support',
    description: "Send us an email and we'll respond within 24 hours",
    value: 'blessancorley@gmail.com',
    action: 'mailto:blessancorley@gmail.com',
    primary: true,
  },
  {
    icon: Phone,
    title: 'Phone Support',
    description: 'Call us for immediate assistance',
    value: '+91 9976768211',
    action: 'tel:+919976768211',
    primary: true,
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Support',
    description: 'Chat with us on WhatsApp for quick help',
    value: '+91 9976768211',
    action: 'https://wa.me/919976768211?text=Hi! I need help with Fixly.',
    primary: true,
  },
  {
    icon: MapPin,
    title: 'Location',
    description: "We're based in Tamil Nadu, India",
    value: 'Coimbatore, Tamil Nadu',
    action: 'https://www.google.com/maps/search/?api=1&query=11.000044,77.080355',
    primary: false,
  },
  {
    icon: Clock,
    title: 'Support Hours',
    description: 'Our team is available to help you',
    value: 'Mon-Sat: 9 AM - 8 PM IST',
    action: null,
    primary: false,
  },
];

export const supportCategories: SupportCategory[] = [
  {
    icon: Users,
    title: 'General Inquiry',
    description: 'Questions about our platform and services',
  },
  {
    icon: HelpCircle,
    title: 'Technical Support',
    description: 'Issues with the website or mobile app',
  },
  {
    icon: AlertCircle,
    title: 'Report an Issue',
    description: 'Report problems with users or services',
  },
  {
    icon: Headphones,
    title: 'Account Help',
    description: 'Issues with your account or billing',
  },
];

export const faqItems: FaqItem[] = [
  {
    question: 'How do I create an account?',
    answer:
      "Click \"Get Started\" on our homepage and choose whether you're a hirer or fixer. Follow the simple signup process to create your account.",
  },
  {
    question: 'How does pricing work?',
    answer:
      'Fixers set their own rates. Hirers can see quotes before hiring. We offer a Pro subscription for ₹99/month for unlimited applications.',
  },
  {
    question: 'Are fixers verified?',
    answer:
      'Yes, all fixers go through our verification process including background checks and skill assessment for your safety and peace of mind.',
  },
  {
    question: "What if I'm not satisfied with the service?",
    answer:
      "We have a dispute resolution process. Contact our support team and we'll help mediate between you and the service provider.",
  },
];
