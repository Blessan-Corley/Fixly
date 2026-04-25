import { Eye, Lock, Shield } from 'lucide-react';

export const privacySections = [
  {
    id: 'information-collection',
    title: 'Information We Collect',
    icon: Eye,
    content: [
      {
        subtitle: 'Personal Information',
        text: 'We collect information you provide when creating an account, including your name, email address, phone number, location, and profile details. For service providers, we also collect information about your skills and work experience.',
      },
      {
        subtitle: 'Usage Information',
        text: 'We automatically collect information about how you use our platform, including pages visited, features used, time spent on the platform, and device information.',
      },
      {
        subtitle: 'Communication Data',
        text: 'We store messages, job applications, reviews, and other communications made through our platform to facilitate service delivery and dispute resolution.',
      },
      {
        subtitle: 'Location Information',
        text: 'With your explicit consent, we collect and store your GPS location to show you nearby job opportunities and improve service matching. You can enable or disable location sharing at any time in your settings. Location data is stored securely and is never shared without your permission.',
      },
    ],
  },
  {
    id: 'information-use',
    title: 'How We Use Your Information',
    icon: Shield,
    content: [
      {
        subtitle: 'Service Provision',
        text: 'We use your information to provide, maintain, and improve our marketplace services, including matching customers with service providers and facilitating transactions.',
      },
      {
        subtitle: 'Communication',
        text: 'We use your contact information to send important updates about your account, job status, and platform changes. You can control marketing communications in your settings.',
      },
      {
        subtitle: 'Safety and Security',
        text: 'We use your information to verify identities, prevent fraud, ensure platform safety, and comply with legal obligations.',
      },
      {
        subtitle: 'Location-Based Services',
        text: 'When you enable location sharing, we use your GPS coordinates to: (1) Show you job opportunities near your location, (2) Calculate and display distances to job locations, (3) Sort search results by proximity, and (4) Provide location-based filtering options. Your location data is processed locally and stored securely with encryption.',
      },
    ],
  },
  {
    id: 'information-sharing',
    title: 'Information Sharing',
    icon: Lock,
    content: [
      {
        subtitle: 'With Service Providers',
        text: 'When you hire a service provider or apply for a job, relevant contact and project information is shared to facilitate the service delivery.',
      },
      {
        subtitle: 'Legal Requirements',
        text: 'We may disclose information when required by law, court order, or to protect our rights, property, or safety of our users.',
      },
      {
        subtitle: 'Business Transfers',
        text: 'In the event of a merger, acquisition, or sale of assets, user information may be transferred to the new entity.',
      },
    ],
  },
  {
    id: 'data-security',
    title: 'Data Security',
    icon: Shield,
    content: [
      {
        subtitle: 'Encryption',
        text: 'We use industry-standard encryption to protect your data during transmission and storage.',
      },
      {
        subtitle: 'Access Controls',
        text: 'Access to personal information is restricted to authorized personnel who need it to perform their job functions.',
      },
      {
        subtitle: 'Regular Audits',
        text: 'We regularly review and update our security practices to protect against unauthorized access, alteration, or disclosure.',
      },
    ],
  },
  {
    id: 'data-retention',
    title: 'Data Retention',
    icon: Lock,
    content: [
      {
        subtitle: 'Account Data',
        text: 'We retain your personal information for as long as your account is active or as needed to provide services. When you delete your account, most data is removed within 30 days.',
      },
      {
        subtitle: 'Location Data',
        text: 'Location information is cached for 6 hours in your browser (refreshed as you move) and stored in your account preferences until you disable location sharing. Recent locations are tracked to improve job matching. You can clear all location data at any time through your account settings.',
      },
      {
        subtitle: 'Transaction Records',
        text: 'Job completion records, payments, and reviews may be retained longer for business operations, legal compliance, and dispute resolution purposes.',
      },
    ],
  },
  {
    id: 'user-rights',
    title: 'Your Rights',
    icon: Eye,
    content: [
      {
        subtitle: 'Access and Correction',
        text: 'You can access and update your personal information through your account settings at any time.',
      },
      {
        subtitle: 'Data Deletion',
        text: 'You can request deletion of your account and associated data by contacting our support team. Some information may be retained for legal or legitimate business purposes.',
      },
      {
        subtitle: 'Data Portability',
        text: 'You can request a copy of your personal data in a commonly used format.',
      },
      {
        subtitle: 'Location Control',
        text: 'You have complete control over location sharing: enable or disable at any time, view stored location data, delete location history, and choose between exact or approximate location sharing. Location access requires explicit consent and can be revoked immediately.',
      },
    ],
  },
];
