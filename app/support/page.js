'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  MessageSquare, 
  Phone, 
  Mail, 
  Clock, 
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  BookOpen,
  Users,
  CreditCard,
  Shield,
  Settings,
  Bug,
  Star
} from 'lucide-react';

export default function SupportPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const supportOptions = [
    {
      title: 'Live Chat',
      description: 'Get instant help from our support team',
      availability: 'Available 24/7',
      icon: MessageSquare,
      color: 'bg-green-500',
      action: 'Start Chat'
    },
    {
      title: 'Phone Support',
      description: 'Speak directly with a support specialist',
      availability: 'Mon-Fri, 9 AM - 8 PM EST',
      icon: Phone,
      color: 'bg-blue-500',
      action: 'Call Now',
      phone: '1-800-FIXLY-HELP'
    },
    {
      title: 'Email Support',
      description: 'Send us a detailed message about your issue',
      availability: 'Response within 24 hours',
      icon: Mail,
      color: 'bg-fixly-primary',
      action: 'Send Email',
      email: 'blessancorley@gmail.com'
    }
  ];

  const faqCategories = [
    { id: 'all', name: 'All Topics', icon: HelpCircle },
    { id: 'getting-started', name: 'Getting Started', icon: BookOpen },
    { id: 'account', name: 'Account & Profile', icon: Users },
    { id: 'payments', name: 'Payments & Billing', icon: CreditCard },
    { id: 'safety', name: 'Safety & Security', icon: Shield },
    { id: 'technical', name: 'Technical Issues', icon: Settings }
  ];

  const faqs = [
    {
      category: 'getting-started',
      question: 'How do I create an account on Fixly?',
      answer: 'Creating an account is simple! Click "Get Started" on our homepage, choose whether you\'re a customer or service provider, and follow the signup process. You\'ll need to verify your email and complete your profile to get started.'
    },
    {
      category: 'getting-started',
      question: 'How do I post my first job?',
      answer: 'After creating your account, go to your dashboard and click "Post a Job". Provide a detailed description, add photos if helpful, set your budget, and choose your preferred timeline. Your job will be visible to verified service providers in your area.'
    },
    {
      category: 'account',
      question: 'How do I update my profile information?',
      answer: 'Log into your account and go to "Profile" in your dashboard. From there, you can update your contact information, profile photo, bio, skills (for fixers), and other details. Make sure to save your changes.'
    },
    {
      category: 'account',
      question: 'How do I verify my account?',
      answer: 'Account verification involves confirming your email, phone number, and identity. For service providers, we also require background checks and skill verification. Check your dashboard for verification status and next steps.'
    },
    {
      category: 'payments',
      question: 'How does payment work on Fixly?',
      answer: 'We use a secure escrow system. Customers pay upfront, and funds are held safely until the job is completed to satisfaction. Service providers receive payment after job completion and customer approval.'
    },
    {
      category: 'payments',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, debit cards, PayPal, and bank transfers. All payments are processed securely through our encrypted payment system.'
    },
    {
      category: 'safety',
      question: 'How do you verify service providers?',
      answer: 'All service providers undergo comprehensive background checks, identity verification, and skill assessment. We verify licenses where required and continuously monitor platform activity for safety.'
    },
    {
      category: 'safety',
      question: 'What if I\'m not satisfied with the work?',
      answer: 'We offer a satisfaction guarantee. If you\'re not happy with the work, contact our support team within 48 hours. We\'ll work with both parties to resolve the issue, and you may be eligible for a refund.'
    },
    {
      category: 'technical',
      question: 'I\'m having trouble uploading photos',
      answer: 'Make sure your photos are in JPG, PNG, or GIF format and under 10MB each. Try clearing your browser cache or using a different browser. If issues persist, contact our technical support team.'
    },
    {
      category: 'technical',
      question: 'The website is loading slowly',
      answer: 'Slow loading can be due to internet connection, browser issues, or temporary server load. Try refreshing the page, clearing your browser cache, or switching to a different browser. Contact support if problems continue.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
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
            <HelpCircle className="h-10 w-10 text-fixly-accent" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-fixly-text mb-6"
          >
            How Can We
            <span className="block text-fixly-accent">Help You?</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-fixly-text-light mb-8"
          >
            Get support, find answers, and connect with our team
          </motion.p>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative max-w-md mx-auto mb-8"
          >
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fixly-text-muted h-5 w-5" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-fixly-border bg-fixly-card focus:outline-none focus:ring-2 focus:ring-fixly-accent focus:border-transparent"
            />
          </motion.div>
        </div>
      </section>

      {/* Support Options */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Get Support
            </h2>
            <p className="text-xl text-fixly-text-light">
              Choose the best way to reach our support team
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {supportOptions.map((option, index) => (
              <motion.div
                key={option.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-fixly-card rounded-xl p-8 text-center hover:shadow-fixly-lg transition-all duration-300 hover-lift"
              >
                <div className={`${option.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6`}>
                  <option.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-fixly-text mb-2">
                  {option.title}
                </h3>
                
                <p className="text-fixly-text-light mb-4">
                  {option.description}
                </p>
                
                <div className="flex items-center justify-center text-sm text-fixly-text-muted mb-6">
                  <Clock className="h-4 w-4 mr-2" />
                  {option.availability}
                </div>
                
                {option.phone && (
                  <div className="text-fixly-accent font-semibold mb-4">
                    {option.phone}
                  </div>
                )}
                
                {option.email && (
                  <div className="text-fixly-accent font-semibold mb-4">
                    {option.email}
                  </div>
                )}
                
                <button className="btn-primary w-full">
                  {option.action}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-fixly-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-fixly-text-light">
              Find quick answers to common questions
            </p>
          </div>

          {/* FAQ Categories */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {faqCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-fixly-accent text-white'
                    : 'bg-fixly-bg text-fixly-text-muted hover:bg-fixly-accent/10'
                }`}
              >
                <category.icon className="h-4 w-4 mr-2" />
                {category.name}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-fixly-bg rounded-lg border border-fixly-border overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-fixly-card/50 transition-colors"
                >
                  <span className="font-semibold text-fixly-text pr-4">
                    {faq.question}
                  </span>
                  {expandedFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-fixly-accent flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-fixly-text-muted flex-shrink-0" />
                  )}
                </button>
                
                {expandedFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-fixly-text-light leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {filteredFaqs.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-fixly-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-fixly-accent" />
              </div>
              <h3 className="text-lg font-semibold text-fixly-text mb-2">
                No results found
              </h3>
              <p className="text-fixly-text-light">
                Try adjusting your search terms or browse a different category
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              More Ways to Get Help
            </h2>
            <p className="text-xl text-fixly-text-light">
              Explore additional resources and community support
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-fixly-card rounded-xl p-6 text-center hover:shadow-fixly transition-all duration-200 hover-lift"
            >
              <div className="bg-fixly-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-6 w-6 text-fixly-accent" />
              </div>
              <h3 className="text-lg font-semibold text-fixly-text mb-2">
                Help Documentation
              </h3>
              <p className="text-fixly-text-light mb-4 text-sm">
                Comprehensive guides and tutorials for all platform features
              </p>
              <button 
                onClick={() => router.push('/resources')}
                className="btn-secondary text-sm"
              >
                Browse Docs
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-fixly-card rounded-xl p-6 text-center hover:shadow-fixly transition-all duration-200 hover-lift"
            >
              <div className="bg-fixly-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-fixly-accent" />
              </div>
              <h3 className="text-lg font-semibold text-fixly-text mb-2">
                Community Forum
              </h3>
              <p className="text-fixly-text-light mb-4 text-sm">
                Connect with other users and get help from the community
              </p>
              <button className="btn-secondary text-sm">
                Join Community
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-fixly-card rounded-xl p-6 text-center hover:shadow-fixly transition-all duration-200 hover-lift"
            >
              <div className="bg-fixly-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Bug className="h-6 w-6 text-fixly-accent" />
              </div>
              <h3 className="text-lg font-semibold text-fixly-text mb-2">
                Report a Bug
              </h3>
              <p className="text-fixly-text-light mb-4 text-sm">
                Found a technical issue? Help us improve by reporting bugs
              </p>
              <button className="btn-secondary text-sm">
                Report Issue
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-fixly-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-fixly-bg rounded-2xl p-12 shadow-fixly-lg"
          >
            <div className="bg-fixly-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="h-8 w-8 text-fixly-accent" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-fixly-text mb-4">
              Still Need Help?
            </h2>
            <p className="text-xl text-fixly-text-light mb-8">
              Our support team is here to help you succeed on Fixly
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary text-lg px-8 py-4 hover-lift">
                <MessageSquare className="h-5 w-5 mr-2" />
                Start Live Chat
              </button>
              <button 
                onClick={() => router.push('/contact')}
                className="btn-secondary text-lg px-8 py-4 hover-lift"
              >
                <Mail className="h-5 w-5 mr-2" />
                Send Email
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