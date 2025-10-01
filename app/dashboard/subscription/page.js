'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Crown,
  CheckCircle,
  Clock,
  Zap,
  Rocket,
  Star,
  Users,
  TrendingUp,
  Shield,
  Headphones,
  ArrowRight,
  Loader,
  X,
  Calendar,
  CreditCard,
  AlertCircle,
  Check,
  User,
  Target,
  Award,
  Briefcase,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const { user } = useApp();

  if (user?.role === 'fixer') {
    // Redirect fixers to fixer subscription page
    return <FixerSubscriptionContent />;
  }

  return (
    <RoleGuard roles={['hirer']} fallback={
      <div className="p-6 lg:p-8">
        <div className="max-w-md mx-auto text-center">
          <div className="card">
            <Crown className="h-16 w-16 text-fixly-accent mx-auto mb-4" />
            <h2 className="text-xl font-bold text-fixly-text mb-2">
              Subscription Required
            </h2>
            <p className="text-fixly-text-muted mb-4">
              Please sign in to manage your subscription.
            </p>
            <button
              onClick={() => window.location.href = '/auth/signin'}
              className="btn-primary w-full"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    }>
      <HirerSubscriptionContent />
    </RoleGuard>
  );
}

function HirerSubscriptionContent() {
  const { user, updateUser } = useApp();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  // AbortController refs
  const createOrderAbortRef = useRef(null);
  const verifyPaymentAbortRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (createOrderAbortRef.current) createOrderAbortRef.current.abort();
      if (verifyPaymentAbortRef.current) verifyPaymentAbortRef.current.abort();
    };
  }, []);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Pro',
      price: 99,
      duration: 'month',
      description: 'Perfect for getting started',
      popular: true,
      savings: null
    },
    {
      id: 'yearly',
      name: 'Yearly Pro',
      price: 999,
      duration: 'year',
      description: 'Best value for serious fixers',
      popular: false,
      savings: '₹189 (16% off)'
    }
  ];

  const features = [
    {
      icon: Zap,
      title: 'Unlimited Job Applications',
      description: 'Apply to as many jobs as you want without any restrictions',
      free: '3 applications',
      pro: 'Unlimited'
    },
    {
      icon: Target,
      title: 'Priority Listing',
      description: 'Your applications appear higher in search results',
      free: false,
      pro: true
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Track success rates, earnings, and job performance',
      free: 'Basic stats',
      pro: 'Advanced insights'
    },
    {
      icon: Crown,
      title: 'Profile Boost',
      description: 'Enhanced visibility to hirers with Pro badge',
      free: false,
      pro: true
    },
    {
      icon: Shield,
      title: 'Priority Support',
      description: 'Get faster responses from our support team',
      free: 'Standard',
      pro: 'Priority'
    },
    {
      icon: Award,
      title: 'Exclusive Job Alerts',
      description: 'Get notified about high-value jobs first',
      free: false,
      pro: true
    }
  ];

  const handleUpgrade = async (planType) => {
    if (user?.plan?.type === 'pro' && user?.plan?.status === 'active') {
      toast.error('You already have an active Pro subscription');
      return;
    }

    setLoading(true);
    try {
      // Cancel previous create order request
      if (createOrderAbortRef.current) {
        createOrderAbortRef.current.abort();
      }
      const createController = new AbortController();
      createOrderAbortRef.current = createController;

      // Create Razorpay order
      const response = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planType }),
        signal: createController.signal
      });

      if (createController.signal.aborted) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create order');
      }

      // Validate Razorpay configuration
      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        throw new Error('Razorpay is not configured. Please contact support.');
      }

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
        name: 'Fixly Pro',
        description: `${data.plan.name} Subscription`,
        image: '/logo.png',
        prefill: {
          name: data.user.name,
          email: data.user.email,
          contact: data.user.phone
        },
        theme: {
          color: '#DCF763'
        },
        handler: async (response) => {
          // Verify payment
          try {
            // Cancel previous verify request
            if (verifyPaymentAbortRef.current) {
              verifyPaymentAbortRef.current.abort();
            }
            const verifyController = new AbortController();
            verifyPaymentAbortRef.current = verifyController;

            const verifyResponse = await fetch('/api/subscription/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                planType: planType
              }),
              signal: verifyController.signal
            });

            if (verifyController.signal.aborted) {
              return;
            }

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok) {
              toast.success('Subscription activated successfully! 🎉');

              // Update user context
              updateUser({
                plan: {
                  type: 'pro',
                  status: 'active',
                  startDate: verifyData.subscription.startDate,
                  endDate: verifyData.subscription.endDate,
                  creditsUsed: 0
                }
              });

              router.push('/dashboard/browse-jobs');
            } else {
              throw new Error(verifyData.message || 'Payment verification failed');
            }
          } catch (error) {
            if (error.name === 'AbortError') {
              return;
            }
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const isCurrentPlanActive = user?.plan?.type === 'pro' && user?.plan?.status === 'active';
  const creditsRemaining = Math.max(0, 3 - (user?.plan?.creditsUsed || 0));

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Crown className="h-16 w-16 text-fixly-accent mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-fixly-text mb-4">
            Upgrade to Fixly Pro
          </h1>
          <p className="text-xl text-fixly-text-light max-w-2xl mx-auto">
            Unlock unlimited job applications and premium features to grow your business faster
          </p>
        </motion.div>

        {/* Current Status */}
        {isCurrentPlanActive ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 max-w-md mx-auto"
          >
            <div className="flex items-center justify-center mb-2">
              <Crown className="h-6 w-6 text-green-600 mr-2" />
              <span className="font-semibold text-green-800">Pro Active</span>
            </div>
            <p className="text-green-700 text-sm">
              Your Pro subscription is active until{' '}
              {user?.plan?.endDate && new Date(user.plan.endDate).toLocaleDateString()}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8 max-w-md mx-auto"
          >
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6 text-orange-600 mr-2" />
              <span className="font-semibold text-orange-800">Free Plan</span>
            </div>
            <p className="text-orange-700 text-sm">
              {creditsRemaining > 0 
                ? `${creditsRemaining} free application${creditsRemaining > 1 ? 's' : ''} remaining`
                : 'All free applications used. Upgrade to continue applying.'
              }
            </p>
          </motion.div>
        )}
      </div>

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`card relative ${
              plan.popular ? 'ring-2 ring-fixly-accent' : ''
            } ${selectedPlan === plan.id ? 'ring-2 ring-fixly-accent' : ''}`}
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
              <p className="text-fixly-text-muted mb-4">
                {plan.description}
              </p>
              
              <div className="mb-4">
                <span className="text-4xl font-bold text-fixly-text">
                  ₹{plan.price}
                </span>
                <span className="text-fixly-text-muted">/{plan.duration}</span>
              </div>

              {plan.savings && (
                <div className="text-green-600 font-medium text-sm mb-4">
                  Save {plan.savings}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedPlan(plan.id);
                if (!isCurrentPlanActive) {
                  handleUpgrade(plan.id);
                }
              }}
              disabled={loading || isCurrentPlanActive}
              className={`btn-primary w-full mb-6 ${
                isCurrentPlanActive ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading && selectedPlan === plan.id ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : null}
              {isCurrentPlanActive 
                ? 'Current Plan' 
                : `Upgrade to ${plan.name}`
              }
            </button>

            <div className="text-sm text-fixly-text-muted">
              <p>✓ All Pro features included</p>
              <p>✓ Cancel anytime</p>
              <p>✓ Instant activation</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Feature Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-16"
      >
        <h2 className="text-2xl font-bold text-fixly-text text-center mb-8">
          Feature Comparison
        </h2>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Feature column */}
            <div className="lg:col-span-2">
              <h3 className="font-semibold text-fixly-text mb-4">Features</h3>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <feature.icon className="h-5 w-5 text-fixly-accent mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-fixly-text">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-fixly-text-muted mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Free plan column */}
            <div className="text-center">
              <h3 className="font-semibold text-fixly-text mb-4">Free Plan</h3>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="h-16 flex items-center justify-center">
                    {feature.free === false ? (
                      <X className="h-5 w-5 text-red-500" />
                    ) : feature.free === true ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <span className="text-sm text-fixly-text-muted">
                        {feature.free}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pro plan column */}
            <div className="text-center">
              <h3 className="font-semibold text-fixly-text mb-4">
                Pro Plan
                <Crown className="h-4 w-4 text-fixly-accent inline ml-1" />
              </h3>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="h-16 flex items-center justify-center">
                    {feature.pro === false ? (
                      <X className="h-5 w-5 text-red-500" />
                    ) : feature.pro === true ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <span className="text-sm font-medium text-fixly-text">
                        {feature.pro}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Success Stories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-16"
      >
        <h2 className="text-2xl font-bold text-fixly-text text-center mb-8">
          Success Stories
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: 'Rajesh Kumar',
              role: 'Electrician',
              location: 'Mumbai',
              story: 'Increased my monthly earnings by 300% after upgrading to Pro. The unlimited applications really made the difference!',
              earnings: '₹45,000/month'
            },
            {
              name: 'Priya Sharma',
              role: 'Interior Designer',
              location: 'Bangalore',
              story: 'Pro helped me get premium projects. The priority listing feature gets me noticed by high-paying clients.',
              earnings: '₹65,000/month'
            },
            {
              name: 'Mohammed Ali',
              role: 'Plumber',
              location: 'Delhi',
              story: 'The analytics feature helped me understand which jobs I should focus on. Now I work smarter, not harder.',
              earnings: '₹38,000/month'
            }
          ].map((story, index) => (
            <div key={index} className="card">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 bg-fixly-accent/20 rounded-full flex items-center justify-center mr-3">
                  <User className="h-6 w-6 text-fixly-accent" />
                </div>
                <div>
                  <h4 className="font-medium text-fixly-text">{story.name}</h4>
                  <p className="text-sm text-fixly-text-muted">
                    {story.role} • {story.location}
                  </p>
                </div>
              </div>
              
              <p className="text-fixly-text-muted mb-4 italic">
                "{story.story}"
              </p>
              
              <div className="flex items-center text-green-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" />
                {story.earnings}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* FAQ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-16"
      >
        <h2 className="text-2xl font-bold text-fixly-text text-center mb-8">
          Frequently Asked Questions
        </h2>

        <div className="max-w-3xl mx-auto space-y-6">
          {[
            {
              question: 'Can I cancel my subscription anytime?',
              answer: 'Yes, you can cancel your Pro subscription at any time. You\'ll continue to have Pro features until your current billing period ends.'
            },
            {
              question: 'What happens to my applications if I downgrade?',
              answer: 'All your existing applications remain active. However, you\'ll be limited to 3 applications per month on the free plan.'
            },
            {
              question: 'Do I get a refund if I cancel?',
              answer: 'We offer a 7-day money-back guarantee. If you\'re not satisfied within the first week, contact support for a full refund.'
            },
            {
              question: 'Can I upgrade from monthly to yearly?',
              answer: 'Yes, you can upgrade anytime. We\'ll prorate your current subscription and charge the difference for the yearly plan.'
            }
          ].map((faq, index) => (
            <div key={index} className="card">
              <h4 className="font-medium text-fixly-text mb-2">
                {faq.question}
              </h4>
              <p className="text-fixly-text-muted">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      {!isCurrentPlanActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <div className="card max-w-md mx-auto">
            <Crown className="h-12 w-12 text-fixly-accent mx-auto mb-4" />
            <h3 className="text-xl font-bold text-fixly-text mb-2">
              Ready to Go Pro?
            </h3>
            <p className="text-fixly-text-muted mb-6">
              Join hundreds of successful hirers who've upgraded their hiring process with Fixly Pro.
            </p>
            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Crown className="h-4 w-4 mr-2" />
              )}
              Start Your Pro Journey
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function FixerSubscriptionContent() {
  const { user, updateUser } = useApp();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  // AbortController ref
  const subscribeAbortRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscribeAbortRef.current) subscribeAbortRef.current.abort();
    };
  }, []);

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Pro',
      price: 99,
      duration: 'month',
      description: 'Perfect for getting started',
      popular: true,
      savings: null
    },
    {
      id: 'yearly',
      name: 'Yearly Pro',
      price: 999,
      duration: 'year',
      description: 'Best value for serious fixers',
      popular: false,
      savings: '₹189 (16% off)'
    }
  ];

  const features = [
    {
      icon: Zap,
      title: 'Unlimited Job Applications',
      description: 'Apply to as many jobs as you want without any restrictions',
      free: '3 applications',
      pro: 'Unlimited'
    },
    {
      icon: Target,
      title: 'Priority Listing',
      description: 'Your applications appear higher in search results',
      free: false,
      pro: true
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Track success rates, earnings, and job performance',
      free: 'Basic stats',
      pro: 'Advanced insights'
    },
    {
      icon: Crown,
      title: 'Profile Boost',
      description: 'Enhanced visibility to hirers with Pro badge',
      free: false,
      pro: true
    },
    {
      icon: Shield,
      title: 'Priority Support',
      description: 'Get faster responses from our support team',
      free: 'Standard',
      pro: 'Priority'
    },
    {
      icon: Award,
      title: 'Exclusive Job Alerts',
      description: 'Get notified about high-value jobs first',
      free: false,
      pro: true
    }
  ];

  const handleUpgrade = async (planType) => {
    if (user?.plan?.type === 'pro' && user?.plan?.status === 'active') {
      toast.error('You already have an active Pro subscription');
      return;
    }

    setLoading(true);
    try {
      // Cancel previous request
      if (subscribeAbortRef.current) {
        subscribeAbortRef.current.abort();
      }
      const abortController = new AbortController();
      subscribeAbortRef.current = abortController;

      // For fixers, we can use a different API endpoint or same with role detection
      const response = await fetch('/api/subscription/fixer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          duration: planType
        }),
        signal: abortController.signal
      });

      if (abortController.signal.aborted) {
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Pro subscription activated successfully! 🎉');
        
        // Update user context
        updateUser({
          plan: data.plan
        });

        // Refresh page to show updated status
        window.location.reload();
      } else {
        throw new Error(data.message || 'Failed to activate subscription');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to activate subscription');
    } finally {
      setLoading(false);
    }
  };

  const isCurrentPlanActive = user?.plan?.type === 'pro' && user?.plan?.status === 'active';
  const creditsRemaining = Math.max(0, 3 - (user?.plan?.creditsUsed || 0));

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Crown className="h-16 w-16 text-fixly-accent mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-fixly-text mb-4">
            Upgrade to Fixly Pro
          </h1>
          <p className="text-xl text-fixly-text-light max-w-2xl mx-auto">
            Unlock unlimited job applications and premium features to grow your business faster
          </p>
        </motion.div>

        {/* Current Status */}
        {isCurrentPlanActive ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 max-w-md mx-auto"
          >
            <div className="flex items-center justify-center mb-2">
              <Crown className="h-6 w-6 text-green-600 mr-2" />
              <span className="font-semibold text-green-800">Pro Active</span>
            </div>
            <p className="text-green-700 text-sm">
              Your Pro subscription is active until{' '}
              {user?.plan?.endDate && new Date(user.plan.endDate).toLocaleDateString()}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8 max-w-md mx-auto"
          >
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6 text-orange-600 mr-2" />
              <span className="font-semibold text-orange-800">Free Plan</span>
            </div>
            <p className="text-orange-700 text-sm">
              {creditsRemaining > 0 
                ? `${creditsRemaining} free application${creditsRemaining > 1 ? 's' : ''} remaining`
                : 'All free applications used. Upgrade to continue applying.'
              }
            </p>
          </motion.div>
        )}
      </div>

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`card relative ${
              plan.popular ? 'ring-2 ring-fixly-accent' : ''
            } ${selectedPlan === plan.id ? 'ring-2 ring-fixly-accent' : ''}`}
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
              <p className="text-fixly-text-muted mb-4">
                {plan.description}
              </p>
              
              <div className="mb-4">
                <span className="text-4xl font-bold text-fixly-text">
                  ₹{plan.price}
                </span>
                <span className="text-fixly-text-muted">/{plan.duration}</span>
              </div>

              {plan.savings && (
                <div className="text-green-600 font-medium text-sm mb-4">
                  Save {plan.savings}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedPlan(plan.id);
                if (!isCurrentPlanActive) {
                  handleUpgrade(plan.id);
                }
              }}
              disabled={loading || isCurrentPlanActive}
              className={`btn-primary w-full mb-6 ${
                isCurrentPlanActive ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading && selectedPlan === plan.id ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : null}
              {isCurrentPlanActive 
                ? 'Current Plan' 
                : `Upgrade to ${plan.name}`
              }
            </button>

            <div className="text-sm text-fixly-text-muted">
              <p>✓ All Pro features included</p>
              <p>✓ Cancel anytime</p>
              <p>✓ Instant activation</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Feature Comparison - abbreviated for space */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-16"
      >
        <h2 className="text-2xl font-bold text-fixly-text text-center mb-8">
          Feature Comparison
        </h2>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Feature column */}
            <div className="lg:col-span-2">
              <h3 className="font-semibold text-fixly-text mb-4">Features</h3>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <feature.icon className="h-5 w-5 text-fixly-accent mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-fixly-text">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-fixly-text-muted mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Free plan column */}
            <div className="text-center">
              <h3 className="font-semibold text-fixly-text mb-4">Free Plan</h3>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="h-16 flex items-center justify-center">
                    {feature.free === false ? (
                      <X className="h-5 w-5 text-red-500" />
                    ) : feature.free === true ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <span className="text-sm text-fixly-text-muted">
                        {feature.free}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pro plan column */}
            <div className="text-center">
              <h3 className="font-semibold text-fixly-text mb-4">
                Pro Plan
                <Crown className="h-4 w-4 text-fixly-accent inline ml-1" />
              </h3>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="h-16 flex items-center justify-center">
                    {feature.pro === false ? (
                      <X className="h-5 w-5 text-red-500" />
                    ) : feature.pro === true ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <span className="text-sm font-medium text-fixly-text">
                        {feature.pro}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      {!isCurrentPlanActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <div className="card max-w-md mx-auto">
            <Crown className="h-12 w-12 text-fixly-accent mx-auto mb-4" />
            <h3 className="text-xl font-bold text-fixly-text mb-2">
              Ready to Go Pro?
            </h3>
            <p className="text-fixly-text-muted mb-6">
              Join thousands of successful fixers who've upgraded their business with Fixly Pro.
            </p>
            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Crown className="h-4 w-4 mr-2" />
              )}
              Start Your Pro Journey
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}