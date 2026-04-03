import { Award, Heart, Users, Zap } from 'lucide-react';

export const founders = [
  {
    id: 1,
    name: 'Blessan Corley A',
    role: 'CEO & Co-Founder',
    bio: 'Visionary leader in tech startups. Passionate about connecting people and solving real-world problems through technology.',
    expertise: 'Product Strategy, Business Development, Team Leadership',
    quote: 'Building bridges between skilled professionals and those who need their services.',
    image: '/founders/blessan.jpg',
    social: {
      linkedin: '#',
      twitter: '#',
      github: undefined as string | undefined,
      email: 'blessancorley@gmail.com',
    },
  },
  {
    id: 2,
    name: 'Vinoth Kumar M',
    role: 'CTO & Co-Founder',
    bio: 'Full-stack developer and system architect with expertise in scalable platforms. Loves building robust, user-friendly applications.',
    expertise: 'Software Architecture, DevOps, Mobile Development',
    quote: 'Technology should make life simpler, not more complicated.',
    image: '/founders/vinoth.jpg',
    social: {
      linkedin: '#',
      twitter: undefined as string | undefined,
      github: '#',
      email: 'blessancorley@gmail.com',
    },
  },
  {
    id: 3,
    name: 'Dinesh Madhavan M',
    role: 'Co-Founder',
    bio: 'Operations expert with deep understanding of local markets. Ensures quality service delivery and customer satisfaction.',
    expertise: 'Operations Management, Quality Assurance, Customer Success',
    quote: 'Excellence in execution is what transforms ideas into impact.',
    image: '/founders/dinesh.jpg',
    social: {
      linkedin: '#',
      twitter: '#',
      github: undefined as string | undefined,
      email: 'blessancorley@gmail.com',
    },
  },
];

export const values = [
  {
    icon: Heart,
    title: 'Customer First',
    description:
      'Every decision we make puts our users at the center. Your success is our success.',
  },
  {
    icon: Award,
    title: 'Quality Excellence',
    description:
      'We maintain the highest standards in service delivery and platform reliability.',
  },
  {
    icon: Users,
    title: 'Community Building',
    description: 'Fostering trust and collaboration between service providers and customers.',
  },
  {
    icon: Zap,
    title: 'Innovation',
    description:
      'Continuously improving our platform with cutting-edge technology and user feedback.',
  },
];

export const stats = [
  { label: 'Active Users', value: '50,000+' },
  { label: 'Jobs Completed', value: '100,000+' },
  { label: 'Cities Covered', value: '500+' },
  { label: 'Success Rate', value: '95%' },
];
