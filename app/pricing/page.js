'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Check, 
  X, 
  Star, 
  Zap, 
  Users, 
  Target,
  CreditCard,
  Shield,
  Clock,
  HelpCircle
} from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('fixer');

  const fixerPlans = [
    {
      name: 'Free Plan',
      price: '₹0',
      period: '/month',
      description: 'Perfect for getting started as a service provider',
      features: [
        '3 job applications per month',
        'Basic profile visibility',
        'Customer reviews and ratings',
        'In-app messaging',
        'Basic support'
      ],
      limitations: [
        'Limited to 3 applications',
        'No priority in search results',
        'No advanced analytics'
      ],
      buttonText: 'Get Started Free',
      popular: false,
      color: 'border-fixly-border'
    },
    {
      name: 'Pro Plan',
      price: '₹99',
      period: '/month',
      description: 'Unlimited opportunities for serious professionals',
      features: [
        'Unlimited job applications',
        'Priority profile visibility',
        'Advanced portfolio showcase',
        'Priority customer support',
        'Detailed analytics dashboard',
        'Featured in search results',
        'Auto-apply to matching jobs',
        'Monthly performance reports'
      ],
      limitations: [],
      buttonText: 'Upgrade to Pro',
      popular: true,
      color: 'border-fixly-accent'
    }
  ];

  const hirerFeatures = [
    {
      icon: Users,
      title: 'Unlimited Job Posting',
      description: 'Post as many jobs as you need with a 6-hour interval between posts to maintain quality'
    },
    {
      icon: Shield,
      title: 'Verified Professionals',
      description: 'All service providers are background verified for your safety and peace of mind'
    },
    {
      icon: Star,
      title: 'Quality Assurance',
      description: 'Review and rating system ensures you get the best service providers'
    },
    {
      icon: Clock,
      title: 'Quick Response',
      description: 'Get responses from qualified professionals within minutes of posting'
    }
  ];

  const faqs = [
    {
      question: 'How does the Free Plan work for fixers?',
      answer: 'Free users get 3 job applications per month. This resets on the 1st of each month. You can upgrade to Pro anytime for unlimited applications.'
    },
    {
      question: 'Is posting jobs really free for hirers?',
      answer: 'Yes! Hirers can post unlimited jobs for free. We only ask for a 6-hour gap between posts to maintain platform quality.'
    },
    {
      question: 'How do payments work between hirers and fixers?',
      answer: 'Payments are made directly between hirers and fixers. Fixly doesn&apos;t charge any commission on transactions.'
    },
    {
      question: 'Can I cancel my Pro subscription anytime?',
      answer: 'Yes, you can cancel your Pro subscription anytime. You&apos;ll continue to have Pro benefits until the end of your billing period.'
    },
    {
      question: 'Do you offer annual discounts?',
      answer: 'Yes! Annual Pro subscription costs ₹999/year (save ₹189 compared to monthly billing).'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit/debit cards, UPI, net banking, and digital wallets through our secure Razorpay integration.'
    }
  ];

  const handleSignup = (plan) => {
    if (plan === 'free') {
      router.push('/auth/signup?role=fixer');
    } else {
      router.push('/auth/signup?role=fixer&plan=pro');
    }
  };

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Header */}
      <header className="bg-fixly-card/80 backdrop-blur-md border-b border-fixly-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-fixly-text">Pricing</h1>
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
          <CreditCard className="h-16 w-16 text-fixly-accent mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-fixly-text mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-fixly-text-light max-w-3xl mx-auto mb-8">
            Choose the plan that works best for you. No hidden fees, no surprises. 
            Start free and upgrade when you&apos;re ready for more opportunities.
          </p>
        </motion.div>

        {/* Role Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-fixly-card rounded-lg p-1 flex">
            <button
              onClick={() => setSelectedRole('fixer')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                selectedRole === 'fixer'
                  ? 'bg-fixly-accent text-fixly-text'
                  : 'text-fixly-text-muted hover:text-fixly-text'
              }`}
            >
              For Fixers
            </button>
            <button
              onClick={() => setSelectedRole('hirer')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                selectedRole === 'hirer'
                  ? 'bg-fixly-accent text-fixly-text'
                  : 'text-fixly-text-muted hover:text-fixly-text'
              }`}
            >
              For Hirers
            </button>
          </div>
        </div>

        {selectedRole === 'fixer' ? (
          /* Fixer Pricing */
          <div className="grid lg:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
            {fixerPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`card relative ${plan.color} ${
                  plan.popular ? 'shadow-xl' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-fixly-accent text-fixly-text px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-fixly-text mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center mb-4">
                    <span className="text-4xl font-bold text-fixly-text">{plan.price}</span>
                    <span className="text-fixly-text-muted ml-1">{plan.period}</span>
                  </div>
                  <p className="text-fixly-text-light">{plan.description}</p>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <h4 className="font-semibold text-fixly-text mb-3">What's included:</h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-fixly-text-light text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.limitations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-fixly-text mb-3">Limitations:</h4>
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, idx) => (
                          <li key={idx} className="flex items-center">
                            <X className="h-4 w-4 text-red-500 mr-3 flex-shrink-0" />
                            <span className="text-fixly-text-muted text-sm">{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleSignup(plan.name === 'Free Plan' ? 'free' : 'pro')}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    plan.popular
                      ? 'bg-fixly-accent text-fixly-text hover:bg-fixly-accent-dark'
                      : 'bg-fixly-border text-fixly-text hover:bg-fixly-accent hover:text-fixly-text'
                  }`}
                >
                  {plan.buttonText}
                </button>

                {plan.name === 'Pro Plan' && (
                  <p className="text-center text-fixly-text-muted text-sm mt-4">
                    ₹999/year (save ₹189)
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          /* Hirer Features */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto mb-16"
          >
            <div className="card text-center mb-12">
              <h2 className="text-3xl font-bold text-fixly-text mb-4">
                Free for All Hirers
              </h2>
              <p className="text-xl text-fixly-text-light mb-6">
                Post unlimited jobs and connect with verified professionals at no cost
              </p>
              <div className="text-6xl font-bold text-fixly-accent mb-4">₹0</div>
              <p className="text-fixly-text-muted">Always free, no hidden charges</p>
              <button
                onClick={() => router.push('/auth/signup?role=hirer')}
                className="btn-primary mt-6 px-8 py-3"
              >
                Start Hiring Today
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {hirerFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start p-6 rounded-xl hover:bg-fixly-card transition-colors"
                >
                  <feature.icon className="h-8 w-8 text-fixly-accent mr-4 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-fixly-text mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-fixly-text-light">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-fixly-text mb-12 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card"
              >
                <div className="flex items-start">
                  <HelpCircle className="h-6 w-6 text-fixly-accent mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-fixly-text mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-fixly-text-light">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card text-center mt-16"
        >
          <h2 className="text-2xl font-bold text-fixly-text mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-fixly-text-light mb-6">
            Join thousands of satisfied users on Fixly today
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/auth/signup?role=hirer')}
              className="btn-primary"
            >
              Start Hiring (Free)
            </button>
            <button
              onClick={() => router.push('/auth/signup?role=fixer')}
              className="btn-secondary"
            >
              Become a Fixer
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