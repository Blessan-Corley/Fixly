// app/auth/verified/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Mail, Phone, Shield } from 'lucide-react';

export default function VerifiedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  
  const type = searchParams.get('type') || 'email';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const getVerificationDetails = () => {
    switch (type) {
      case 'email':
        return {
          icon: Mail,
          title: 'Email Verified!',
          description: 'Your email address has been successfully verified.',
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
      case 'phone':
        return {
          icon: Phone,
          title: 'Phone Verified!',
          description: 'Your phone number has been successfully verified.',
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
      case 'account':
        return {
          icon: Shield,
          title: 'Account Fully Verified!',
          description: 'Your account is now completely verified and secure.',
          color: 'text-fixly-primary',
          bgColor: 'bg-fixly-accent/20'
        };
      default:
        return {
          icon: CheckCircle,
          title: 'Verification Complete!',
          description: 'Your verification was successful.',
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
    }
  };

  const details = getVerificationDetails();
  const IconComponent = details.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`w-20 h-20 ${details.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}
          >
            <IconComponent className={`h-10 w-10 ${details.color}`} />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-fixly-text mb-4"
          >
            {details.title}
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-fixly-text-light mb-6 leading-relaxed"
          >
            {details.description}
          </motion.p>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"
          >
            <h3 className="font-medium text-green-800 mb-2">You can now:</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Access all platform features</li>
              <li>• Build trust with other users</li>
              <li>• Receive important notifications</li>
              <li>• Enjoy enhanced security</li>
            </ul>
          </motion.div>

          {/* Auto redirect notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-fixly-text-muted mb-6"
          >
            Redirecting to dashboard in {countdown} seconds...
          </motion.div>

          {/* Continue Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onClick={() => router.push('/dashboard')}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>

          {/* Additional Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="pt-4 border-t border-gray-200 mt-6"
          >
            <p className="text-xs text-fixly-text-muted mb-3">
              Need to verify more?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/auth/verify-account')}
                className="flex-1 text-sm text-fixly-accent hover:text-fixly-accent-dark font-medium"
              >
                Complete Verification
              </button>
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="flex-1 text-sm text-fixly-accent hover:text-fixly-accent-dark font-medium"
              >
                Account Settings
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}