'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Headphones,
  Users,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Send form data to backend API
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        toast.success(data.message || 'Message sent successfully! We\'ll get back to you soon.', {
          style: { background: 'green', color: 'white' }
        });

        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          category: 'general'
        });
      } else {
        toast.error(data.message || 'Failed to send message. Please try again.', {
          style: { background: 'red', color: 'white' }
        });
      }

    } catch (error) {
      console.error('Contact form submission error:', error);
      toast.error('Network error. Please check your connection and try again.', {
        style: { background: 'red', color: 'white' }
      });
    } finally {
      setLoading(false);
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Send us an email and we&apos;ll respond within 24 hours',
      value: 'blessancorley@gmail.com',
      action: 'mailto:blessancorley@gmail.com',
      primary: true
    },
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Call us for immediate assistance',
      value: '+91 9976768211',
      action: 'tel:+919976768211',
      primary: true
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp Support',
      description: 'Chat with us on WhatsApp for quick help',
      value: '+91 9976768211',
      action: 'https://wa.me/919976768211?text=Hi! I need help with Fixly.',
      primary: true
    },
    {
      icon: MapPin,
      title: 'Location',
      description: 'We&apos;re based in Tamil Nadu, India',
      value: 'Coimbatore, Tamil Nadu',
      action: 'https://www.google.com/maps/search/?api=1&query=11.000044,77.080355',
      primary: false
    },
    {
      icon: Clock,
      title: 'Support Hours',
      description: 'Our team is available to help you',
      value: 'Mon-Sat: 9 AM - 8 PM IST',
      action: null,
      primary: false
    }
  ];

  const supportCategories = [
    {
      icon: Users,
      title: 'General Inquiry',
      description: 'Questions about our platform and services'
    },
    {
      icon: HelpCircle,
      title: 'Technical Support',
      description: 'Issues with the website or mobile app'
    },
    {
      icon: AlertCircle,
      title: 'Report an Issue',
      description: 'Report problems with users or services'
    },
    {
      icon: Headphones,
      title: 'Account Help',
      description: 'Issues with your account or billing'
    }
  ];

  const faqItems = [
    {
      question: 'How do I create an account?',
      answer: 'Click "Get Started" on our homepage and choose whether you\'re a hirer or fixer. Follow the simple signup process to create your account.'
    },
    {
      question: 'How does pricing work?',
      answer: 'Fixers set their own rates. Hirers can see quotes before hiring. We offer a Pro subscription for ₹99/month for unlimited applications.'
    },
    {
      question: 'Are fixers verified?',
      answer: 'Yes, all fixers go through our verification process including background checks and skill assessment for your safety and peace of mind.'
    },
    {
      question: 'What if I\'m not satisfied with the service?',
      answer: 'We have a dispute resolution process. Contact our support team and we\'ll help mediate between you and the service provider.'
    }
  ];

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Header */}
      <header className="bg-fixly-card/80 backdrop-blur-md border-b border-fixly-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-fixly-text">Contact Us</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <MessageSquare className="h-16 w-16 text-fixly-accent mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-fixly-text mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-fixly-text-light max-w-3xl mx-auto mb-8">
            Have questions, feedback, or need help? We&apos;re here to assist you.
            Our friendly support team is ready to help you get the most out of Fixly.
          </p>
        </motion.div>

        {/* Contact Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          {/* First row - 3 primary contact methods */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {contactMethods.slice(0, 3).map((method, index) => (
              <div
                key={index}
                className={`card text-center p-6 ${
                  method.primary ? 'border-fixly-accent' : ''
                }`}
              >
                <method.icon className="h-12 w-12 text-fixly-accent mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-fixly-text mb-2">
                  {method.title}
                </h3>
                <p className="text-fixly-text-muted text-sm mb-4">
                  {method.description}
                </p>
                {method.action ? (
                  <a
                    href={method.action}
                    target={method.action.startsWith('http') ? '_blank' : '_self'}
                    rel={method.action.startsWith('http') ? 'noopener noreferrer' : ''}
                    className="text-fixly-accent hover:text-fixly-accent-dark font-medium transition-colors"
                  >
                    {method.value}
                  </a>
                ) : (
                  <span className="text-fixly-text font-medium">
                    {method.value}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Second row - 2 info cards centered */}
          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
              {contactMethods.slice(3).map((method, index) => (
                <div
                  key={index + 3}
                  className={`card text-center p-6 ${
                    method.primary ? 'border-fixly-accent' : ''
                  }`}
                >
                  <method.icon className="h-12 w-12 text-fixly-accent mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-fixly-text mb-2">
                    {method.title}
                  </h3>
                  <p className="text-fixly-text-muted text-sm mb-4">
                    {method.description}
                  </p>
                  {method.action ? (
                    <a
                      href={method.action}
                      target={method.action.startsWith('http') ? '_blank' : '_self'}
                      rel={method.action.startsWith('http') ? 'noopener noreferrer' : ''}
                      className="text-fixly-accent hover:text-fixly-accent-dark font-medium transition-colors"
                    >
                      {method.value}
                    </a>
                  ) : (
                    <span className="text-fixly-text font-medium">
                      {method.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="card"
          >
            <h2 className="text-2xl font-bold text-fixly-text mb-6">
              Send us a Message
            </h2>
            <p className="text-fixly-text-light mb-6">
              Fill out the form below and we&apos;ll get back to you as soon as possible.
            </p>

            {submitted ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-fixly-text mb-2">
                  Message Sent Successfully!
                </h3>
                <p className="text-fixly-text-light mb-6">
                  Thank you for contacting us. We&apos;ll respond within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn-primary"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="input-field"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="input-field"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="input-field"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="select-field"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="billing">Billing & Account</option>
                      <option value="report">Report an Issue</option>
                      <option value="feedback">Feedback & Suggestions</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className="input-field"
                    placeholder="Brief description of your inquiry"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    rows={5}
                    className="textarea-field"
                    placeholder="Please describe your question or issue in detail..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin h-5 w-5 mr-2 border-2 border-fixly-text border-t-transparent rounded-full" />
                  ) : (
                    <Send className="h-5 w-5 mr-2" />
                  )}
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </motion.div>

          {/* Support Information */}
          <div className="space-y-8">
            {/* Support Categories */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="card"
            >
              <h2 className="text-2xl font-bold text-fixly-text mb-6">
                How Can We Help?
              </h2>
              <div className="space-y-4">
                {supportCategories.map((category, index) => (
                  <div key={index} className="flex items-start p-4 rounded-lg hover:bg-fixly-bg transition-colors">
                    <category.icon className="h-6 w-6 text-fixly-accent mr-4 mt-1" />
                    <div>
                      <h3 className="font-semibold text-fixly-text mb-1">
                        {category.title}
                      </h3>
                      <p className="text-fixly-text-muted text-sm">
                        {category.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Response Promise */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="card border-fixly-accent"
            >
              <div className="text-center">
                <Clock className="h-12 w-12 text-fixly-accent mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-fixly-text mb-2">
                  Quick Response Guarantee
                </h3>
                <p className="text-fixly-text-light">
                  We typically respond to all inquiries within 24 hours during business days.
                  For urgent matters, please call us directly.
                </p>
              </div>
            </motion.div>

            {/* FAQ Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <h2 className="text-2xl font-bold text-fixly-text mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="border-b border-fixly-border pb-4 last:border-b-0">
                    <h3 className="font-semibold text-fixly-text mb-2">
                      {item.question}
                    </h3>
                    <p className="text-fixly-text-light text-sm">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Additional Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card mt-12 text-center"
        >
          <h2 className="text-2xl font-bold text-fixly-text mb-4">
            Other Ways to Reach Us
          </h2>
          <p className="text-fixly-text-light mb-6">
            Choose the method that works best for you. We&apos;re committed to providing
            excellent customer service and support.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:blessancorley@gmail.com"
              className="btn-primary flex items-center justify-center"
            >
              <Mail className="h-5 w-5 mr-2" />
              Email Support
            </a>
            <a
              href="tel:+919976768211"
              className="btn-secondary flex items-center justify-center"
            >
              <Phone className="h-5 w-5 mr-2" />
              Call Now
            </a>
            <a
              href="https://wa.me/919976768211?text=Hi! I need help with Fixly."
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent flex items-center justify-center"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              WhatsApp Chat
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