// app/terms/page.js
'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  FileText, 
  Users, 
  CreditCard, 
  Shield, 
  AlertTriangle,
  Scale,
  CheckCircle
} from 'lucide-react';

export default function TermsConditionsPage() {
  const router = useRouter();

  const sections = [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      icon: CheckCircle,
      content: [
        {
          text: 'By accessing and using Fixly, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.'
        },
        {
          text: 'These terms apply to all users of the platform, including hirers (customers seeking services) and fixers (service providers).'
        }
      ]
    },
    {
      id: 'platform-description',
      title: 'Platform Description',
      icon: FileText,
      content: [
        {
          subtitle: 'Service Overview',
          text: 'Fixly is a hyperlocal marketplace platform that connects customers with local service professionals. We facilitate connections but are not directly involved in the actual service provision.'
        },
        {
          subtitle: 'Independent Contractors',
          text: 'Service providers on our platform are independent contractors, not employees of Fixly. We do not control how they perform their services.'
        }
      ]
    },
    {
      id: 'user-responsibilities',
      title: 'User Responsibilities',
      icon: Users,
      content: [
        {
          subtitle: 'Account Information',
          text: 'You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.'
        },
        {
          subtitle: 'Accurate Information',
          text: 'You agree to provide accurate, current, and complete information when creating your profile and posting jobs or applications.'
        },
        {
          subtitle: 'Lawful Use',
          text: 'You agree to use the platform only for lawful purposes and in a way that does not infringe the rights of others or restrict their use of the platform.'
        },
        {
          subtitle: 'Communication',
          text: 'You agree to communicate respectfully with other users and respond promptly to messages related to your jobs or applications.'
        },
        {
          subtitle: 'Location Services',
          text: 'If you choose to enable location services, you consent to the collection and use of your GPS coordinates to provide location-based features. You can disable location sharing at any time through your account settings. Misuse of location data or providing false location information is prohibited.'
        }
      ]
    },
    {
      id: 'service-terms',
      title: 'Service Terms',
      icon: Shield,
      content: [
        {
          subtitle: 'For Hirers (Customers)',
          text: 'You may post one job every 6 hours to maintain platform quality. You are responsible for clearly describing your requirements and providing a safe working environment for service providers.'
        },
        {
          subtitle: 'For Fixers (Service Providers)',
          text: 'Free users get 3 job applications. Pro subscription (₹99/month) provides unlimited applications. You are responsible for delivering services as agreed and maintaining professional standards.'
        },
        {
          subtitle: 'Quality Standards',
          text: 'All users must maintain professional conduct. Fixly reserves the right to remove users who consistently receive poor ratings or violate community standards.'
        }
      ]
    },
    {
      id: 'payment-terms',
      title: 'Payment and Subscription',
      icon: CreditCard,
      content: [
        {
          subtitle: 'Subscription Fees',
          text: 'Pro subscription for fixers costs ₹99/month or ₹999/year. Payments are processed through Razorpay. Subscriptions auto-renew unless cancelled.'
        },
        {
          subtitle: 'Service Payments',
          text: 'Payment for services is made directly between hirers and fixers. Fixly is not responsible for payment disputes between users.'
        },
        {
          subtitle: 'Refunds',
          text: 'Subscription refunds are available within 7 days of purchase. Service payment disputes should be resolved between the parties involved.'
        }
      ]
    },
    {
      id: 'disputes',
      title: 'Disputes and Resolution',
      icon: Scale,
      content: [
        {
          subtitle: 'User Disputes',
          text: 'Disputes between hirers and fixers should first be resolved directly between the parties. If resolution is not possible, users may request Fixly mediation.'
        },
        {
          subtitle: 'Platform Disputes',
          text: 'Any disputes with Fixly should be resolved through arbitration in accordance with Indian law, with jurisdiction in Coimbatore, Tamil Nadu.'
        },
        {
          subtitle: 'Limitation of Liability',
          text: 'Fixly is not liable for damages arising from disputes between users or from services provided through the platform.'
        }
      ]
    },
    {
      id: 'prohibited-activities',
      title: 'Prohibited Activities',
      icon: AlertTriangle,
      content: [
        {
          text: 'Creating false or misleading profiles or job postings'
        },
        {
          text: 'Using the platform for illegal activities or services'
        },
        {
          text: 'Harassment, discrimination, or abusive behavior toward other users'
        },
        {
          text: 'Attempting to circumvent platform fees or policies'
        },
        {
          text: 'Soliciting users to conduct business outside the platform to avoid fees'
        },
        {
          text: 'Posting content that violates intellectual property rights'
        }
      ]
    },
    {
      id: 'termination',
      title: 'Account Termination',
      icon: AlertTriangle,
      content: [
        {
          subtitle: 'User Termination',
          text: 'You may terminate your account at any time by contacting our support team. Upon termination, your access to the platform will be removed.'
        },
        {
          subtitle: 'Platform Termination',
          text: 'Fixly reserves the right to terminate accounts that violate these terms, engage in fraudulent activity, or pose risks to other users.'
        },
        {
          subtitle: 'Effect of Termination',
          text: 'Upon termination, all rights and obligations under these terms cease, except those that by their nature should survive termination.'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Header */}
      <header className="bg-fixly-card/80 backdrop-blur-md border-b border-fixly-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-fixly-text">Terms & Conditions</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Scale className="h-16 w-16 text-fixly-accent mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-fixly-text mb-4">
            Terms & Conditions
          </h1>
          <p className="text-xl text-fixly-text-light max-w-3xl mx-auto mb-6">
            Please read these terms and conditions carefully before using our platform. 
            By using Fixly, you agree to be bound by these terms.
          </p>
          <div className="text-sm text-fixly-text-muted">
            Last updated: May 15, 2025
          </div>
        </motion.div>

        {/* Table of Contents */}
        <div className="card mb-12">
          <h2 className="text-xl font-semibold text-fixly-text mb-4">Table of Contents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center p-3 rounded-lg hover:bg-fixly-bg transition-colors"
              >
                <section.icon className="h-5 w-5 text-fixly-accent mr-3" />
                <span className="text-fixly-text hover:text-fixly-accent">
                  {section.title}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section, index) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="card"
            >
              <div className="flex items-center mb-6">
                <section.icon className="h-8 w-8 text-fixly-accent mr-4" />
                <h2 className="text-2xl font-bold text-fixly-text">
                  {section.title}
                </h2>
              </div>

              <div className="space-y-4">
                {section.content.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    {item.subtitle && (
                      <h3 className="text-lg font-semibold text-fixly-text mb-2">
                        {item.subtitle}
                      </h3>
                    )}
                    <p className="text-fixly-text-light leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {/* Changes to Terms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mt-12"
        >
          <h2 className="text-2xl font-bold text-fixly-text mb-4">
            Changes to Terms
          </h2>
          <p className="text-fixly-text-light mb-4">
            Fixly reserves the right to modify these terms at any time. We will notify 
            users of significant changes via email or platform notifications.
          </p>
          <p className="text-fixly-text-light">
            Your continued use of the platform after changes indicates your acceptance 
            of the updated terms.
          </p>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mt-12"
        >
          <h2 className="text-2xl font-bold text-fixly-text mb-4">
            Questions About These Terms?
          </h2>
          <p className="text-fixly-text-light mb-4">
            If you have any questions about these Terms & Conditions, please contact us: blessancorley@gmail.com  , call : +91 9976768211
          </p>
          <div className="flex flex-col md:flex-row gap-4">
            <a 
              href="mailto:blessancorley@gmail.com"
              className="btn-primary flex items-center justify-center"
            >
              Email Support
            </a>
            <a 
              href="tel:+919976768211"
              className="btn-secondary flex items-center justify-center"
            >
              Call Support
            </a>
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