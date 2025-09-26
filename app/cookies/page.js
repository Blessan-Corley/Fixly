'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Cookie, 
  Shield, 
  Settings, 
  Globe,
  Users,
  BarChart3,
  Lock,
  CheckCircle
} from 'lucide-react';

export default function CookiesPage() {
  const router = useRouter();

  const cookieTypes = [
    {
      title: 'Essential Cookies',
      description: 'These cookies are necessary for the website to function and cannot be switched off.',
      icon: Lock,
      examples: [
        'Authentication and login status',
        'Security and fraud prevention',
        'Shopping cart and order processing',
        'Form submission and data validation'
      ]
    },
    {
      title: 'Analytics Cookies',
      description: 'These cookies help us understand how visitors use our website.',
      icon: BarChart3,
      examples: [
        'Page views and user interactions',
        'Traffic sources and referrals',
        'Performance and loading times',
        'Popular content and features'
      ]
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
        'Saved searches and favorites'
      ]
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
        'Last known location timestamp'
      ]
    },
    {
      title: 'Social Media Cookies',
      description: 'These cookies enable social media features and content sharing.',
      icon: Users,
      examples: [
        'Social media login integration',
        'Content sharing buttons',
        'Social media feeds and widgets',
        'Profile synchronization'
      ]
    }
  ];

  const thirdPartyServices = [
    {
      name: 'Google Analytics',
      purpose: 'Website analytics and performance tracking',
      type: 'Analytics'
    },
    {
      name: 'Google Ads',
      purpose: 'Advertising and conversion tracking',
      type: 'Marketing'
    },
    {
      name: 'Facebook Pixel',
      purpose: 'Social media integration and advertising',
      type: 'Social & Marketing'
    },
    {
      name: 'NextAuth.js',
      purpose: 'User authentication and session management',
      type: 'Essential'
    }
  ];

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Header */}
      <header className="bg-fixly-card/80 backdrop-blur-md border-b border-fixly-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-fixly-text">Cookie Policy</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="bg-fixly-accent/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Cookie className="h-10 w-10 text-fixly-accent" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-fixly-text mb-6">
            How Fixly Uses Cookies
          </h1>
          <p className="text-xl text-fixly-text-light">
            Learn about how we use cookies to improve your experience on our platform
          </p>
        </motion.div>

        {/* What Are Cookies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mb-12"
        >
          <h2 className="text-3xl font-bold text-fixly-text mb-6">What Are Cookies?</h2>
          <p className="text-fixly-text-light leading-relaxed mb-4">
            As is common practice with almost all professional websites, Fixly uses cookies, which are tiny files 
            that are downloaded to your device, to improve your experience. These small text files help us remember 
            your preferences, keep you logged in, and understand how you use our service marketplace.
          </p>
          <p className="text-fixly-text-light leading-relaxed">
            This page describes what information cookies gather, how we use it, and why we sometimes need to store 
            these cookies. We'll also explain how you can control these cookies, though disabling some may affect 
            certain features of Fixly's functionality.
          </p>
        </motion.div>

        {/* How We Use Cookies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mb-12"
        >
          <h2 className="text-3xl font-bold text-fixly-text mb-6">How Fixly Uses Cookies</h2>
          <p className="text-fixly-text-light leading-relaxed mb-6">
            We use cookies for various reasons to enhance your experience on Fixly. Unfortunately, in most cases, 
            there are no industry-standard options for disabling cookies without completely disabling the 
            functionality they provide to our service marketplace.
          </p>
          <p className="text-fixly-text-light leading-relaxed">
            We recommend leaving all cookies enabled if you're unsure whether you need them, as they may be used 
            to provide services you use on Fixly, such as job posting, fixer matching, and secure payments.
          </p>
        </motion.div>

        {/* Cookie Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-fixly-text mb-8">Types of Cookies We Use</h2>

          {/* First row - 3 essential cookie types */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {cookieTypes.slice(0, 3).map((type, index) => (
              <motion.div
                key={type.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-fixly-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                    <type.icon className="h-6 w-6 text-fixly-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-fixly-text">
                    {type.title}
                  </h3>
                </div>

                <p className="text-fixly-text-light mb-4">
                  {type.description}
                </p>

                <ul className="space-y-2">
                  {type.examples.map((example, exampleIndex) => (
                    <li key={exampleIndex} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-fixly-accent mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-fixly-text-muted">{example}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Second row - 2 additional cookie types centered */}
          <div className="flex justify-center">
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
              {cookieTypes.slice(3).map((type, index) => (
                <motion.div
                  key={type.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (index + 3) * 0.1 }}
                  className="card"
                >
                  <div className="flex items-center mb-4">
                    <div className="bg-fixly-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                      <type.icon className="h-6 w-6 text-fixly-accent" />
                    </div>
                    <h3 className="text-xl font-semibold text-fixly-text">
                      {type.title}
                    </h3>
                  </div>

                  <p className="text-fixly-text-light mb-4">
                    {type.description}
                  </p>

                  <ul className="space-y-2">
                    {type.examples.map((example, exampleIndex) => (
                      <li key={exampleIndex} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-fixly-accent mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-fixly-text-muted">{example}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Third Party Cookies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mb-12"
        >
          <h2 className="text-3xl font-bold text-fixly-text mb-6">Third-Party Services</h2>
          <p className="text-fixly-text-light leading-relaxed mb-6">
            Fixly uses trusted third-party services to provide certain features. These services may set their own 
            cookies to enable functionality such as analytics, authentication, and social media integration.
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-fixly-border">
                  <th className="text-left py-3 px-4 font-semibold text-fixly-text">Service</th>
                  <th className="text-left py-3 px-4 font-semibold text-fixly-text">Purpose</th>
                  <th className="text-left py-3 px-4 font-semibold text-fixly-text">Type</th>
                </tr>
              </thead>
              <tbody>
                {thirdPartyServices.map((service, index) => (
                  <tr key={service.name} className="border-b border-fixly-border/50">
                    <td className="py-3 px-4 text-fixly-text">{service.name}</td>
                    <td className="py-3 px-4 text-fixly-text-light">{service.purpose}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fixly-accent/10 text-fixly-accent">
                        {service.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Disabling Cookies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mb-12"
        >
          <h2 className="text-3xl font-bold text-fixly-text mb-6">Managing Your Cookie Preferences</h2>
          <p className="text-fixly-text-light leading-relaxed mb-4">
            You can control and manage cookies in several ways. Most web browsers automatically accept cookies, 
            but you can usually modify your browser settings to decline cookies if you prefer.
          </p>
          <p className="text-fixly-text-light leading-relaxed mb-6">
            Please note that disabling cookies may affect the functionality of Fixly and many other websites. 
            Some features like user authentication, job applications, and personalized recommendations may not 
            work properly without cookies enabled.
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Important Note</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Disabling essential cookies will prevent you from using core Fixly features such as posting jobs,
                  applying for work, making payments, and accessing your dashboard.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card"
        >
          <h2 className="text-3xl font-bold text-fixly-text mb-6">More Information</h2>
          <p className="text-fixly-text-light leading-relaxed mb-6">
            We hope this clarifies how Fixly uses cookies. If there's something you're unsure about, it's usually 
            safer to leave cookies enabled in case they interact with features you use on our platform.
          </p>
          <p className="text-fixly-text-light leading-relaxed mb-6">
            If you're still looking for more information or have questions about our cookie policy, 
            please don't hesitate to contact us through one of our preferred methods:
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <a 
              href="mailto:blessancorley@gmail.com"
              className="btn-primary flex items-center justify-center"
            >
              Email Support
            </a>
            <button 
              onClick={() => router.push('/contact')}
              className="btn-secondary"
            >
              Contact Form
            </button>
          </div>
        </motion.div>
      </div>

      {/* Back to Home */}
      <div className="fixed bottom-6 left-6">
        <button
          onClick={() => router.push('/')}
          className="bg-fixly-card hover:bg-fixly-card/80 border border-fixly-border rounded-full p-3 shadow-fixly transition-all duration-200 hover-lift"
        >
          <ArrowLeft className="h-5 w-5 text-fixly-text" />
        </button>
      </div>
    </div>
  );
}