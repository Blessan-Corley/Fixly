'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  Search, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Upload,
  MessageSquare,
  Calendar,
  CreditCard,
  Star,
  Shield
} from 'lucide-react';

export default function HowItWorksPage() {
  const router = useRouter();

  const customerSteps = [
    {
      step: 1,
      title: 'Post Your Job',
      description: 'Describe your project with photos and details. Set your budget and preferred timeline.',
      details: [
        'Add photos and detailed description',
        'Set your budget range',
        'Choose preferred timing',
        'Select job category'
      ],
      icon: Upload
    },
    {
      step: 2,
      title: 'Receive Quotes',
      description: 'Get competitive quotes from verified professionals in your area within hours.',
      details: [
        'Verified fixers apply to your job',
        'Compare profiles and ratings',
        'Review quotes and timelines',
        'Ask questions directly'
      ],
      icon: MessageSquare
    },
    {
      step: 3,
      title: 'Choose & Schedule',
      description: 'Select the best fixer for your needs and schedule the work at your convenience.',
      details: [
        'Compare fixer profiles',
        'Check reviews and ratings',
        'Schedule convenient time',
        'Confirm job details'
      ],
      icon: Calendar
    },
    {
      step: 4,
      title: 'Work Completed',
      description: 'Your chosen fixer completes the work professionally and you pay securely.',
      details: [
        'Professional completes work',
        'Inspect and approve results',
        'Secure payment processing',
        'Leave a review'
      ],
      icon: CheckCircle
    }
  ];

  const fixerSteps = [
    {
      step: 1,
      title: 'Create Profile',
      description: 'Build your professional profile with skills, experience, and verification.',
      details: [
        'Complete profile verification',
        'Add skills and certifications',
        'Upload portfolio photos',
        'Set your service areas'
      ],
      icon: Users
    },
    {
      step: 2,
      title: 'Browse Jobs',
      description: 'Find jobs that match your skills and location preferences.',
      details: [
        'Browse available jobs',
        'Filter by location and skills',
        'View job requirements',
        'Check customer ratings'
      ],
      icon: Search
    },
    {
      step: 3,
      title: 'Submit Quotes',
      description: 'Send competitive quotes with your timeline and approach.',
      details: [
        'Submit detailed quotes',
        'Explain your approach',
        'Set realistic timelines',
        'Communicate with customers'
      ],
      icon: CreditCard
    },
    {
      step: 4,
      title: 'Complete Work',
      description: 'Deliver quality work and build your reputation on the platform.',
      details: [
        'Complete work professionally',
        'Maintain communication',
        'Get paid securely',
        'Build 5-star reputation'
      ],
      icon: Star
    }
  ];

  const safetyFeatures = [
    {
      title: 'Background Verification',
      description: 'All fixers undergo comprehensive background checks and identity verification.',
      icon: Shield
    },
    {
      title: 'Secure Payments',
      description: 'Payments are held securely and released only when work is completed satisfactorily.',
      icon: CreditCard
    },
    {
      title: 'Review System',
      description: 'Transparent review system helps you make informed decisions about service providers.',
      icon: Star
    },
    {
      title: 'Customer Support',
      description: '24/7 customer support to help resolve any issues that may arise.',
      icon: MessageSquare
    }
  ];

  const handleGetStarted = (role) => {
    sessionStorage.setItem('selectedRole', role);
    router.push(`/auth/signup?role=${role}`);
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
                onClick={() => handleGetStarted('hirer')}
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
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-fixly-text mb-6"
          >
            How Fixly
            <span className="block text-fixly-accent">Works</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-fixly-text-light mb-8"
          >
            Simple, secure, and reliable way to connect customers with service professionals
          </motion.p>
        </div>
      </section>

      {/* For Customers */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              For Customers
            </h2>
            <p className="text-xl text-fixly-text-light">
              Get your jobs done by verified professionals in 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {customerSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="bg-fixly-card rounded-xl p-6 h-full">
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-fixly-accent text-fixly-text rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold mr-3">
                      {step.step}
                    </div>
                    <step.icon className="h-8 w-8 text-fixly-accent" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-fixly-text mb-3 text-center">
                    {step.title}
                  </h3>
                  
                  <p className="text-fixly-text-light mb-4 text-center">
                    {step.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-start text-sm text-fixly-text-muted">
                        <div className="w-1.5 h-1.5 bg-fixly-accent rounded-full mr-2 mt-2 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {index < customerSteps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 h-6 w-6 text-fixly-accent" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button 
              onClick={() => handleGetStarted('hirer')}
              className="btn-primary text-lg px-8 py-4 hover-lift"
            >
              Post Your First Job
            </button>
          </div>
        </div>
      </section>

      {/* For Fixers */}
      <section className="py-16 bg-fixly-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              For Service Providers
            </h2>
            <p className="text-xl text-fixly-text-light">
              Build your business and find customers in 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {fixerSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="bg-fixly-bg rounded-xl p-6 h-full">
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-fixly-accent text-fixly-text rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold mr-3">
                      {step.step}
                    </div>
                    <step.icon className="h-8 w-8 text-fixly-accent" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-fixly-text mb-3 text-center">
                    {step.title}
                  </h3>
                  
                  <p className="text-fixly-text-light mb-4 text-center">
                    {step.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-start text-sm text-fixly-text-muted">
                        <div className="w-1.5 h-1.5 bg-fixly-accent rounded-full mr-2 mt-2 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {index < fixerSteps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 h-6 w-6 text-fixly-accent" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button 
              onClick={() => handleGetStarted('fixer')}
              className="btn-secondary text-lg px-8 py-4 hover-lift"
            >
              Become a Service Provider
            </button>
          </div>
        </div>
      </section>

      {/* Safety & Security */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Safety & Security
            </h2>
            <p className="text-xl text-fixly-text-light">
              Your safety and security are our top priorities
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {safetyFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="bg-fixly-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-fixly-accent" />
                </div>
                <h3 className="text-xl font-semibold text-fixly-text mb-2">
                  {feature.title}
                </h3>
                <p className="text-fixly-text-light">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-fixly-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-fixly-bg rounded-2xl p-12 shadow-fixly-lg"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Ready to Experience Fixly?
            </h2>
            <p className="text-xl text-fixly-text-light mb-8">
              Join thousands of satisfied customers and service providers
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => handleGetStarted('hirer')}
                className="btn-primary text-lg px-8 py-4 hover-lift"
              >
                I Need a Service
              </button>
              <button 
                onClick={() => handleGetStarted('fixer')}
                className="btn-secondary text-lg px-8 py-4 hover-lift"
              >
                I&apos;m a Service Provider
              </button>
            </div>
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