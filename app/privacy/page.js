// app/privacy/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Eye, Lock, Mail, Phone, MapPin } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const sections = [
    {
      id: 'information-collection',
      title: 'Information We Collect',
      icon: Eye,
      content: [
        {
          subtitle: 'Personal Information',
          text: 'We collect information you provide when creating an account, including your name, email address, phone number, location, and profile details. For service providers, we also collect information about your skills and work experience.'
        },
        {
          subtitle: 'Usage Information',
          text: 'We automatically collect information about how you use our platform, including pages visited, features used, time spent on the platform, and device information.'
        },
        {
          subtitle: 'Communication Data',
          text: 'We store messages, job applications, reviews, and other communications made through our platform to facilitate service delivery and dispute resolution.'
        }
      ]
    },
    {
      id: 'information-use',
      title: 'How We Use Your Information',
      icon: Shield,
      content: [
        {
          subtitle: 'Service Provision',
          text: 'We use your information to provide, maintain, and improve our marketplace services, including matching customers with service providers and facilitating transactions.'
        },
        {
          subtitle: 'Communication',
          text: 'We use your contact information to send important updates about your account, job status, and platform changes. You can control marketing communications in your settings.'
        },
        {
          subtitle: 'Safety and Security',
          text: 'We use your information to verify identities, prevent fraud, ensure platform safety, and comply with legal obligations.'
        }
      ]
    },
    {
      id: 'information-sharing',
      title: 'Information Sharing',
      icon: Lock,
      content: [
        {
          subtitle: 'With Service Providers',
          text: 'When you hire a service provider or apply for a job, relevant contact and project information is shared to facilitate the service delivery.'
        },
        {
          subtitle: 'Legal Requirements',
          text: 'We may disclose information when required by law, court order, or to protect our rights, property, or safety of our users.'
        },
        {
          subtitle: 'Business Transfers',
          text: 'In the event of a merger, acquisition, or sale of assets, user information may be transferred to the new entity.'
        }
      ]
    },
    {
      id: 'data-security',
      title: 'Data Security',
      icon: Shield,
      content: [
        {
          subtitle: 'Encryption',
          text: 'We use industry-standard encryption to protect your data during transmission and storage.'
        },
        {
          subtitle: 'Access Controls',
          text: 'Access to personal information is restricted to authorized personnel who need it to perform their job functions.'
        },
        {
          subtitle: 'Regular Audits',
          text: 'We regularly review and update our security practices to protect against unauthorized access, alteration, or disclosure.'
        }
      ]
    },
    {
      id: 'user-rights',
      title: 'Your Rights',
      icon: Eye,
      content: [
        {
          subtitle: 'Access and Correction',
          text: 'You can access and update your personal information through your account settings at any time.'
        },
        {
          subtitle: 'Data Deletion',
          text: 'You can request deletion of your account and associated data by contacting our support team. Some information may be retained for legal or legitimate business purposes.'
        },
        {
          subtitle: 'Data Portability',
          text: 'You can request a copy of your personal data in a commonly used format.'
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
            <h1 className="text-2xl font-bold text-fixly-text">Privacy Policy</h1>
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
          <Shield className="h-16 w-16 text-fixly-accent mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-fixly-text mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-fixly-text-light max-w-3xl mx-auto mb-6">
            Your privacy is important to us. This policy explains how Fixly collects, 
            uses, and protects your personal information.
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

              <div className="space-y-6">
                {section.content.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    <h3 className="text-lg font-semibold text-fixly-text mb-2">
                      {item.subtitle}
                    </h3>
                    <p className="text-fixly-text-light leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mt-12"
        >
          <h2 className="text-2xl font-bold text-fixly-text mb-6">Contact Us</h2>
          <p className="text-fixly-text-light mb-6">
            If you have any questions about this Privacy Policy or our data practices, 
            please contact us:
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center">
              <Mail className="h-6 w-6 text-fixly-accent mr-3" />
              <div>
                <div className="font-medium text-fixly-text">Email</div>
                <a 
                  href="mailto:blessancorley@gmail.com"
                  className="text-fixly-accent hover:text-fixly-accent-dark"
                >
                  blessancorley@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-center">
              <Phone className="h-6 w-6 text-fixly-accent mr-3" />
              <div>
                <div className="font-medium text-fixly-text">Phone</div>
                <a 
                  href="tel:+919976768211"
                  className="text-fixly-accent hover:text-fixly-accent-dark"
                >
                  +91 9976768211
                </a>
              </div>
            </div>

            <div className="flex items-center">
              <MapPin className="h-6 w-6 text-fixly-accent mr-3" />
              <div>
                <div className="font-medium text-fixly-text">Address</div>
                <div className="text-fixly-text-muted">
                  Coimbatore, Tamil Nadu, India
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mt-12"
        >
          <h2 className="text-2xl font-bold text-fixly-text mb-4">
            Updates to This Policy
          </h2>
          <p className="text-fixly-text-light mb-4">
            We may update this Privacy Policy from time to time. We will notify you of 
            any changes by posting the new Privacy Policy on this page and updating the 
            "Last updated" date.
          </p>
          <p className="text-fixly-text-light">
            We encourage you to review this Privacy Policy periodically for any changes. 
            Changes to this Privacy Policy are effective when they are posted on this page.
          </p>
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