'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  Shield, 
  CheckCircle, 
  Eye, 
  CreditCard, 
  MessageSquare, 
  ArrowLeft,
  UserCheck,
  FileText,
  Lock,
  Phone,
  AlertTriangle,
  Star,
  Camera,
  Clock
} from 'lucide-react';

export default function SafetyPage() {
  const router = useRouter();

  const safetyFeatures = [
    {
      title: 'Identity Verification',
      description: 'All service providers undergo comprehensive identity verification including government ID checks and address verification.',
      icon: UserCheck,
      features: [
        'Government ID verification',
        'Address confirmation',
        'Phone number validation',
        'Social media profile checks'
      ]
    },
    {
      title: 'Background Checks',
      description: 'Professional background screening ensures only trustworthy individuals join our platform.',
      icon: FileText,
      features: [
        'Criminal background checks',
        'Professional reference verification',
        'Previous work history review',
        'Skill and certification validation'
      ]
    },
    {
      title: 'Secure Payments',
      description: 'Advanced payment protection keeps your money safe until work is completed to your satisfaction.',
      icon: CreditCard,
      features: [
        'Escrow payment system',
        'Secure payment processing',
        'Money-back guarantee',
        'Dispute resolution support'
      ]
    },
    {
      title: 'Real-time Monitoring',
      description: 'Our advanced monitoring systems track all platform activity to ensure user safety.',
      icon: Eye,
      features: [
        '24/7 platform monitoring',
        'Suspicious activity detection',
        'Automated fraud prevention',
        'Real-time safety alerts'
      ]
    }
  ];

  const safetyTips = [
    {
      title: 'Before Hiring',
      icon: CheckCircle,
      tips: [
        'Check fixer profiles and ratings thoroughly',
        'Read reviews from previous customers',
        'Verify licenses and certifications if required',
        'Communicate through the platform initially',
        'Get detailed quotes in writing'
      ]
    },
    {
      title: 'During the Job',
      icon: Eye,
      tips: [
        'Be present when work is being performed',
        'Take photos of work progress',
        'Communicate any concerns immediately',
        'Ensure proper safety equipment is used',
        'Keep valuables secure'
      ]
    },
    {
      title: 'After Completion',
      icon: Star,
      tips: [
        'Inspect work thoroughly before approval',
        'Test all completed work',
        'Take photos of completed work',
        'Leave honest reviews',
        'Report any issues promptly'
      ]
    }
  ];

  const emergencyProcedures = [
    {
      title: 'Immediate Safety Concerns',
      description: 'If you feel unsafe or notice dangerous work practices',
      steps: [
        'Stop the work immediately',
        'Remove yourself from the area if necessary',
        'Contact emergency services if there\'s immediate danger',
        'Report the incident to Fixly support',
        'Document the situation with photos if safe to do so'
      ],
      icon: AlertTriangle,
      color: 'bg-red-500'
    },
    {
      title: 'Dispute Resolution',
      description: 'When work quality or payment issues arise',
      steps: [
        'Try to resolve directly with the service provider',
        'Document all communications and issues',
        'Contact Fixly support within 48 hours',
        'Provide evidence (photos, messages, receipts)',
        'Follow our mediation process'
      ],
      icon: MessageSquare,
      color: 'bg-orange-500'
    },
    {
      title: 'Reporting Fraud',
      description: 'If you suspect fraudulent activity',
      steps: [
        'Do not share personal or financial information',
        'Screenshot suspicious messages or profiles',
        'Report immediately to Fixly support',
        'Contact your bank if payments were involved',
        'File a police report if necessary'
      ],
      icon: Shield,
      color: 'bg-fixly-primary'
    }
  ];

  const insuranceInfo = {
    title: 'Insurance & Protection',
    description: 'Comprehensive coverage for peace of mind',
    coverage: [
      {
        type: 'General Liability',
        description: 'Covers property damage and personal injury during service delivery',
        amount: 'Up to $1M per incident'
      },
      {
        type: 'Work Quality Guarantee',
        description: 'Protection against substandard work completion',
        amount: 'Up to job value'
      },
      {
        type: 'Payment Protection',
        description: 'Secure escrow system protects customer payments',
        amount: 'Full payment amount'
      }
    ]
  };

  const handleGetStarted = () => {
    sessionStorage.setItem('selectedRole', 'hirer');
    router.push('/auth/signup?role=hirer');
  };

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Header */}
      <header className="bg-fixly-card/80 backdrop-blur-md border-b border-fixly-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/')}
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <Wrench className="h-8 w-8 text-fixly-accent mr-2" />
                <span className="text-2xl font-bold text-fixly-text">Fixly</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/auth/signin')}
                className="btn-ghost"
              >
                Sign In
              </button>
              <button 
                onClick={handleGetStarted}
                className="btn-primary"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-fixly-accent/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Shield className="h-10 w-10 text-fixly-accent" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-fixly-text mb-6"
          >
            Safety &
            <span className="block text-fixly-accent">Security</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-fixly-text-light mb-8"
          >
            Your safety is our top priority. Learn about our comprehensive security measures and safety guidelines.
          </motion.p>
        </div>
      </section>

      {/* Safety Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Our Safety Features
            </h2>
            <p className="text-xl text-fixly-text-light">
              Multiple layers of protection to ensure your safety and security
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {safetyFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-fixly-card rounded-xl p-8"
              >
                <div className="flex items-center mb-6">
                  <div className="bg-fixly-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                    <feature.icon className="h-6 w-6 text-fixly-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-fixly-text">
                    {feature.title}
                  </h3>
                </div>
                
                <p className="text-fixly-text-light mb-6">
                  {feature.description}
                </p>
                
                <ul className="space-y-3">
                  {feature.features.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-fixly-accent mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-fixly-text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Tips */}
      <section className="py-16 bg-fixly-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Safety Tips
            </h2>
            <p className="text-xl text-fixly-text-light">
              Best practices to ensure a safe and successful service experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {safetyTips.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-fixly-bg rounded-xl p-6"
              >
                <div className="flex items-center mb-6">
                  <div className="bg-fixly-accent/10 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                    <section.icon className="h-5 w-5 text-fixly-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-fixly-text">
                    {section.title}
                  </h3>
                </div>
                
                <ul className="space-y-3">
                  {section.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-fixly-accent rounded-full mr-3 mt-2 flex-shrink-0" />
                      <span className="text-sm text-fixly-text-muted">{tip}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Procedures */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Emergency Procedures
            </h2>
            <p className="text-xl text-fixly-text-light">
              Know what to do in case of safety concerns or disputes
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {emergencyProcedures.map((procedure, index) => (
              <motion.div
                key={procedure.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-fixly-card rounded-xl p-6"
              >
                <div className={`${procedure.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <procedure.icon className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-fixly-text mb-2">
                  {procedure.title}
                </h3>
                
                <p className="text-fixly-text-light mb-6">
                  {procedure.description}
                </p>
                
                <div className="space-y-3">
                  {procedure.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex items-start">
                      <div className="bg-fixly-accent/20 text-fixly-accent rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                        {stepIndex + 1}
                      </div>
                      <span className="text-sm text-fixly-text-muted">{step}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Insurance Information */}
      <section className="py-16 bg-fixly-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="bg-fixly-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-fixly-accent" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              {insuranceInfo.title}
            </h2>
            <p className="text-xl text-fixly-text-light">
              {insuranceInfo.description}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {insuranceInfo.coverage.map((coverage, index) => (
              <motion.div
                key={coverage.type}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-fixly-bg rounded-xl p-6 text-center"
              >
                <h3 className="text-lg font-semibold text-fixly-text mb-2">
                  {coverage.type}
                </h3>
                <p className="text-fixly-text-light mb-4 text-sm">
                  {coverage.description}
                </p>
                <div className="bg-fixly-accent/10 rounded-lg p-3">
                  <span className="text-fixly-accent font-semibold">
                    {coverage.amount}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-fixly-card rounded-2xl p-12 shadow-fixly-lg"
          >
            <div className="bg-fixly-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Phone className="h-8 w-8 text-fixly-accent" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Need Help?
            </h2>
            <p className="text-xl text-fixly-text-light mb-8">
              Our safety team is available 24/7 to assist with any concerns
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <div className="bg-fixly-accent/10 rounded-lg p-3">
                  <Phone className="h-5 w-5 text-fixly-accent" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-fixly-text">24/7 Safety Hotline</div>
                  <div className="text-fixly-text-light">1-800-FIXLY-HELP</div>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-4">
                <div className="bg-fixly-accent/10 rounded-lg p-3">
                  <MessageSquare className="h-5 w-5 text-fixly-accent" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-fixly-text">Live Chat Support</div>
                  <div className="text-fixly-text-light">Available in your dashboard</div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => router.push('/contact')}
              className="btn-primary text-lg px-8 py-4 hover-lift mt-8"
            >
              Contact Support
            </button>
          </motion.div>
        </div>
      </section>

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