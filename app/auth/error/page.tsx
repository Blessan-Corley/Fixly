'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Mail,
  Shield,
  User,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';

import AuthShell from '@/components/auth/AuthShell';
import { env } from '@/lib/env';

type ErrorDetails = {
  title: string;
  description: string;
  solutions: string[];
  action: string;
  actionPath: string;
  isSuccess?: boolean;
};

export default function AuthErrorPage() {
  const router = useRouter();
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [error] = useQueryState('error', parseAsString);
  const [message] = useQueryState('message', parseAsString);
  const [email] = useQueryState('email', parseAsString);
  const [name] = useQueryState('name', parseAsString);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const getErrorDetails = (errorType: string | null): ErrorDetails => {
    switch (errorType) {
      case 'AccountNotFound': {
        return {
          title: "We Couldn't Find Your Fixly Account",
          description:
            'This Google account is not registered with Fixly yet. Create a new Fixly account with it, or try signing in with a different account.',
          solutions: [
            'Create a new Fixly account using this Google account',
            'Try signing in with a different Google account that has a Fixly account',
            'Make sure you have already created a Fixly account before trying to login',
          ],
          action: 'Create New Account',
          actionPath: `/auth/signup?method=google${email ? `&email=${encodeURIComponent(email)}` : ''}${name ? `&name=${encodeURIComponent(name)}` : ''}`,
          isSuccess: false,
        };
      }
      case 'UseEmailSignIn': {
        return {
          title: 'Use Email Sign-In For This Account',
          description:
            'This email already belongs to a Fixly account that was created with email and password.',
          solutions: [
            'Go back to sign in and use your email or username with password',
            'Use Forgot Password if you do not remember your password',
            'Do not create another account with the same email address',
          ],
          action: 'Go To Sign In',
          actionPath: `/auth/signin${email ? `?email=${encodeURIComponent(email)}` : ''}`,
        };
      }
      case 'EmailAlreadyRegistered': {
        return {
          title: 'Email Already Registered',
          description:
            'That email address already has a Fixly account. Use the existing account instead of creating a duplicate one.',
          solutions: [
            'Sign in with the existing account',
            'Use Forgot Password if the account was created with email and password',
            'Use a different Google account or email if you want a different Fixly account',
          ],
          action: 'Sign In Instead',
          actionPath: `/auth/signin${email ? `?email=${encodeURIComponent(email)}` : ''}`,
        };
      }
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          description:
            'Your Google account login was successful, but there was an issue creating your account.',
          solutions: [
            "Try signing up first if you don't have an account",
            'Check if your email is already registered with a different method',
            'Contact support if the issue persists',
          ],
          action: 'Try Signing Up',
          actionPath: '/auth/signup',
        };
      case 'Configuration':
        return {
          title: 'Configuration Error',
          description: "There's a configuration issue with our authentication system.",
          solutions: [
            'This is a temporary issue on our end',
            'Please try again in a few minutes',
            'Contact support if the problem continues',
          ],
          action: 'Try Again',
          actionPath: '/auth/signin',
        };
      case 'Verification':
        return {
          title: 'Email Verification Required',
          description: 'Please verify your email address before signing in.',
          solutions: [
            'Check your email for a verification link',
            'Make sure to verify your email before signing in',
            "Contact support if you didn't receive the email",
          ],
          action: 'Back to Sign In',
          actionPath: '/auth/signin',
        };
      case 'SignupFailed':
        return {
          title: 'Sign Up Temporarily Unavailable',
          description:
            "We couldn't complete your Google sign up at this time. Please try again in a moment.",
          solutions: [
            'Wait a moment and try signing in with Google again',
            'Check your internet connection',
            'If you already have an account, try signing in instead',
            'Contact support if the issue continues',
          ],
          action: 'Try Again',
          actionPath: '/auth/signup',
        };
      case 'ServiceUnavailable':
        return {
          title: 'Service Temporarily Unavailable',
          description:
            "Our service is temporarily unavailable. We're working to restore it as quickly as possible.",
          solutions: [
            'Please try again in a few minutes',
            'Check your internet connection',
            'Our team has been notified and is working on it',
            'Contact support if this persists for more than 10 minutes',
          ],
          action: 'Try Again',
          actionPath: '/auth/signin',
        };
      case 'DatabaseError':
      case 'DatabaseConnectionFailed':
        return {
          title: 'Service Temporarily Unavailable',
          description: "We're experiencing technical difficulties. Please try again shortly.",
          solutions: [
            'Wait a few minutes and try again',
            'Our technical team has been automatically notified',
            'Your data is safe - this is just a temporary connectivity issue',
            'Contact support if you continue to see this message',
          ],
          action: 'Try Again',
          actionPath: '/auth/signin',
        };
      case 'AccountSuspended':
        return {
          title: 'Account Suspended',
          description:
            'Your Fixly account has been suspended. This may be due to a policy violation or suspicious activity.',
          solutions: [
            'Review the Fixly Terms of Service',
            'Contact support to appeal the suspension',
            'Provide any requested information to verify your identity',
          ],
          action: 'Contact Support',
          actionPath: '/contact',
        };
      case 'AccountInactive':
        return {
          title: 'Account Deactivated',
          description:
            'Your account is currently inactive. Please contact support to reactivate it.',
          solutions: [
            'Contact support to request account reactivation',
            'Check your email for any messages from Fixly',
            'Ensure your account complies with our Terms of Service',
          ],
          action: 'Contact Support',
          actionPath: '/contact',
        };
      case 'InvalidEmail':
        return {
          title: 'Invalid Email Address',
          description:
            'The email address associated with your sign-in attempt is invalid or could not be verified.',
          solutions: [
            'Try signing in with a different Google account',
            'Make sure your Google account has a valid email address',
            'Contact support if you believe this is an error',
          ],
          action: 'Try Again',
          actionPath: '/auth/signin',
        };
      default:
        return {
          title: 'Authentication Error',
          description: 'Something went wrong during the authentication process.',
          solutions: [
            'Clear your browser cache and cookies',
            'Try using a different browser',
            'Contact support if the issue persists',
          ],
          action: 'Try Again',
          actionPath: '/auth/signin',
        };
    }
  };

  const errorDetails = getErrorDetails(error);

  return (
    <AuthShell
      title={errorDetails.title}
      subtitle={errorDetails.description}
      badge="Authentication"
      footer={null}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {errorDetails.isSuccess ? (
          <Shield className="mx-auto mb-6 h-16 w-16 text-green-500" />
        ) : (
          <AlertTriangle className="mx-auto mb-6 h-16 w-16 text-red-500" />
        )}

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
            <p className="text-sm text-red-800">
              <strong>Error Code:</strong> {error}
            </p>
          </div>
        ) : null}
        {message ? (
          <div className="mb-6 rounded-lg border border-fixly-border bg-fixly-bg p-3">
            <p className="text-sm text-fixly-text">
              <strong>Message:</strong> {message}
            </p>
          </div>
        ) : null}

        <div className="mb-8 text-left">
          <h3 className="mb-3 font-semibold text-fixly-text">What you can do:</h3>
          <ul className="space-y-2">
            {errorDetails.solutions.map((solution, index) => (
              <li key={index} className="flex items-start">
                <div className="mr-3 mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-fixly-accent" />
                <span className="text-sm text-fixly-text-light">{solution}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push(errorDetails.actionPath)}
            className="btn-primary w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {errorDetails.action}
          </button>

          {error === 'AccountNotFound' ? (
            <button onClick={() => router.push('/auth/signin')} className="btn-secondary w-full">
              <User className="mr-2 h-4 w-4" />
              Try Different Account
            </button>
          ) : null}

          <button onClick={() => router.push('/')} className="btn-ghost w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </button>
        </div>

        <div className="mt-8 border-t border-fixly-border pt-6 dark:border-gray-700">
          <p className="mb-4 text-sm text-fixly-text-muted">
            Still having trouble? We&apos;re here to help!
          </p>

          <div className="flex gap-2">
            <a href={`mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@fixly.com'}`} className="btn-secondary flex-1 text-sm">
              <Mail className="mr-2 h-4 w-4" />
              Email Support
            </a>
            <button
              onClick={() => router.push('/contact')}
              className="btn-secondary flex-1 text-sm"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Contact Us
            </button>
          </div>
        </div>
        {env.NODE_ENV === 'development' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 rounded-2xl border border-fixly-border bg-gray-50 p-4 text-left dark:border-gray-700 dark:bg-gray-800/60"
          >
            <h3 className="mb-2 font-semibold text-gray-800 dark:text-gray-100">
              Debug Information
            </h3>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
              <p>
                <strong>Error:</strong> {error ?? 'Unknown'}
              </p>
              <p>
                <strong>URL:</strong> {currentUrl || 'N/A'}
              </p>
              <p>
                <strong>Timestamp:</strong> {new Date().toISOString()}
              </p>
            </div>
          </motion.div>
        ) : null}
      </motion.div>
    </AuthShell>
  );
}
