'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  BookOpen, 
  Video, 
  FileText, 
  Download, 
  ExternalLink, 
  ArrowLeft,
  Users,
  MessageSquare,
  Star,
  TrendingUp,
  Shield,
  CreditCard,
  Clock,
  Lightbulb,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function ResourcesPage() {
  const router = useRouter();

  const resourceCategories = [
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
          icon: FileText
        },
        {
          title: 'Profile Optimization Video',
          type: 'Video Tutorial',
          description: 'Learn how to create a compelling profile that attracts customers',
          downloadUrl: '#',
          icon: Video
        },
        {
          title: 'Pricing Strategy Worksheet',
          type: 'Worksheet',
          description: 'Tools to help you set competitive and profitable prices',
          downloadUrl: '#',
          icon: Download
        }
      ]
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
          icon: FileText
        },
        {
          title: 'Customer Communication Best Practices',
          type: 'Template Pack',
          description: 'Templates for professional communication with customers',
          downloadUrl: '#',
          icon: MessageSquare
        },
        {
          title: 'Seasonal Business Planning',
          type: 'Worksheet',
          description: 'Plan your business around seasonal demand patterns',
          downloadUrl: '#',
          icon: Download
        }
      ]
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
          icon: CheckCircle
        },
        {
          title: 'Insurance Requirements Guide',
          type: 'Guide',
          description: 'Understanding insurance requirements for service providers',
          downloadUrl: '#',
          icon: FileText
        },
        {
          title: 'Emergency Procedures',
          type: 'Quick Reference',
          description: 'What to do in case of accidents or emergencies',
          downloadUrl: '#',
          icon: AlertCircle
        }
      ]
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
          icon: FileText
        },
        {
          title: 'Expense Tracking Template',
          type: 'Spreadsheet',
          description: 'Track your business expenses and income',
          downloadUrl: '#',
          icon: Download
        },
        {
          title: 'Invoice Templates',
          type: 'Template Pack',
          description: 'Professional invoice templates for your business',
          downloadUrl: '#',
          icon: FileText
        }
      ]
    }
  ];

  const webinars = [
    {
      title: 'Mastering Customer Service Excellence',
      date: 'June 15, 2025',
      time: '2:00 PM EST',
      description: 'Learn how to exceed customer expectations and build lasting relationships',
      status: 'upcoming',
      registrationUrl: '#'
    },
    {
      title: 'Pricing Strategies That Win Jobs',
      date: 'June 8, 2025',
      time: '3:00 PM EST',
      description: 'Advanced pricing techniques to maximize your earnings',
      status: 'upcoming',
      registrationUrl: '#'
    },
    {
      title: 'Building Your Brand on Fixly',
      date: 'May 25, 2025',
      time: '1:00 PM EST',
      description: 'Create a strong personal brand that attracts premium customers',
      status: 'recorded',
      registrationUrl: '#'
    }
  ];

  const communityResources = [
    {
      title: 'Fixer Community Forum',
      description: 'Connect with other service providers, share tips, and get advice',
      icon: Users,
      link: '#'
    },
    {
      title: 'Success Stories',
      description: 'Read inspiring stories from successful fixers on our platform',
      icon: Star,
      link: '#'
    },
    {
      title: 'Best Practices Blog',
      description: 'Weekly articles on business tips, industry trends, and more',
      icon: BookOpen,
      link: '#'
    },
    {
      title: 'Live Chat Support',
      description: '24/7 support for technical issues and platform questions',
      icon: MessageSquare,
      link: '#'
    }
  ];

  const handleGetStarted = () => {
    sessionStorage.setItem('selectedRole', 'fixer');
    router.push('/auth/signup?role=fixer');
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
                Become a Fixer
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
            <Lightbulb className="h-10 w-10 text-fixly-accent" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-fixly-text mb-6"
          >
            Resources for
            <span className="block text-fixly-accent">Success</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-fixly-text-light mb-8"
          >
            Everything you need to succeed as a service provider on Fixly
          </motion.p>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Resource Library
            </h2>
            <p className="text-xl text-fixly-text-light">
              Comprehensive guides, templates, and tools to grow your business
            </p>
          </div>

          <div className="space-y-12">
            {resourceCategories.map((category, categoryIndex) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                viewport={{ once: true }}
                className="bg-fixly-card rounded-xl p-8"
              >
                <div className="flex items-center mb-8">
                  <div className={`${category.color} w-12 h-12 rounded-lg flex items-center justify-center mr-4`}>
                    <category.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-fixly-text mb-1">
                      {category.title}
                    </h3>
                    <p className="text-fixly-text-light">
                      {category.description}
                    </p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {category.resources.map((resource, resourceIndex) => (
                    <div
                      key={resource.title}
                      className="bg-fixly-bg rounded-lg p-6 hover:shadow-fixly transition-all duration-200 hover-lift"
                    >
                      <div className="flex items-center mb-4">
                        <div className="bg-fixly-accent/10 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                          <resource.icon className="h-5 w-5 text-fixly-accent" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-fixly-text">
                            {resource.title}
                          </h4>
                          <span className="text-xs text-fixly-accent font-medium">
                            {resource.type}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-fixly-text-light mb-4">
                        {resource.description}
                      </p>
                      
                      <button className="flex items-center text-fixly-accent hover:text-fixly-accent/80 transition-colors text-sm font-medium">
                        <Download className="h-4 w-4 mr-2" />
                        Download Resource
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Webinars */}
      <section className="py-16 bg-fixly-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Educational Webinars
            </h2>
            <p className="text-xl text-fixly-text-light">
              Join our expert-led sessions to level up your skills
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {webinars.map((webinar, index) => (
              <motion.div
                key={webinar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-fixly-bg rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-fixly-accent/10 w-10 h-10 rounded-lg flex items-center justify-center">
                    <Video className="h-5 w-5 text-fixly-accent" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    webinar.status === 'upcoming' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {webinar.status === 'upcoming' ? 'Upcoming' : 'Recorded'}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-fixly-text mb-2">
                  {webinar.title}
                </h3>
                
                <div className="flex items-center text-sm text-fixly-text-muted mb-3">
                  <Clock className="h-4 w-4 mr-2" />
                  {webinar.date} at {webinar.time}
                </div>
                
                <p className="text-fixly-text-light mb-6 text-sm">
                  {webinar.description}
                </p>
                
                <button className="w-full btn-primary text-sm">
                  {webinar.status === 'upcoming' ? 'Register Now' : 'Watch Recording'}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Resources */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Community & Support
            </h2>
            <p className="text-xl text-fixly-text-light">
              Connect with fellow service providers and get the support you need
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {communityResources.map((resource, index) => (
              <motion.div
                key={resource.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-fixly-card rounded-xl p-6 text-center hover:shadow-fixly transition-all duration-200 hover-lift"
              >
                <div className="bg-fixly-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <resource.icon className="h-6 w-6 text-fixly-accent" />
                </div>
                
                <h3 className="text-lg font-semibold text-fixly-text mb-2">
                  {resource.title}
                </h3>
                
                <p className="text-fixly-text-light mb-4 text-sm">
                  {resource.description}
                </p>
                
                <button className="flex items-center justify-center text-fixly-accent hover:text-fixly-accent/80 transition-colors text-sm font-medium mx-auto">
                  Visit <ExternalLink className="h-4 w-4 ml-2" />
                </button>
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
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-fixly-text-light mb-8">
              Join thousands of successful service providers on Fixly
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={handleGetStarted}
                className="btn-primary text-lg px-8 py-4 hover-lift"
              >
                Become a Fixer
              </button>
              <button 
                onClick={() => router.push('/contact')}
                className="btn-secondary text-lg px-8 py-4 hover-lift"
              >
                Contact Support
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