'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  ArrowLeft, 
  RefreshCw, 
  Mail, 
  Shield,
  User,
  ExternalLink
} from 'lucide-react';

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorDetails = (errorType) => {
    switch (errorType) {
      case 'AccountNotFound':
        const email = searchParams.get('email');
        const name = searchParams.get('name');
        return {
          title: "We Couldn't Find Your Fixly Account",
          description: "We couldn't find your Fixly account. Try Google signup again with an existing account or create a new account.",
          solutions: [
            'Create a new Fixly account using this Google account',
            'Try signing in with a different Google account that has a Fixly account',
            'Make sure you have already created a Fixly account before trying to login'
          ],
          action: 'Create New Account',
          actionPath: `/auth/signup?method=google${email ? `&email=${encodeURIComponent(email)}` : ''}${name ? `&name=${encodeURIComponent(name)}` : ''}`,
          isSuccess: false
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          description: 'Your Google account login was successful, but there was an issue creating your account.',
          solutions: [
            'Try signing up first if you don\'t have an account',
            'Check if your email is already registered with a different method',
            'Contact support if the issue persists'
          ],
          action: 'Try Signing Up',
          actionPath: '/auth/signup'
        };
      case 'Configuration':
        return {
          title: 'Configuration Error',
          description: 'There\'s a configuration issue with our authentication system.',
          solutions: [
            'This is a temporary issue on our end',
            'Please try again in a few minutes',
            'Contact support if the problem continues'
          ],
          action: 'Try Again',
          actionPath: '/auth/signin'
        };
      case 'Verification':
        return {
          title: 'Email Verification Required',
          description: 'Please verify your email address before signing in.',
          solutions: [
            'Check your email for a verification link',
            'Make sure to verify your email before signing in',
            'Contact support if you didn\'t receive the email'
          ],
          action: 'Back to Sign In',
          actionPath: '/auth/signin'
        };
      default:
        return {
          title: 'Authentication Error',
          description: 'Something went wrong during the authentication process.',
          solutions: [
            'Clear your browser cache and cookies',
            'Try using a different browser',
            'Contact support if the issue persists'
          ],
          action: 'Try Again',
          actionPath: '/auth/signin'
        };
    }
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div className="min-h-screen bg-fixly-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center"
        >
          {errorDetails.isSuccess ? (
            <Shield className="h-16 w-16 text-green-500 mx-auto mb-6" />
          ) : (
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          )}
          
          <h1 className="text-2xl font-bold text-fixly-text mb-4">
            {errorDetails.title}
          </h1>
          
          <p className="text-fixly-text-light mb-6">
            {errorDetails.description}
          </p>

          {/* Error Code */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-800">
                <strong>Error Code:</strong> {error}
              </p>
            </div>
          )}

          {/* Solutions */}
          <div className="text-left mb-8">
            <h3 className="font-semibold text-fixly-text mb-3">What you can do:</h3>
            <ul className="space-y-2">
              {errorDetails.solutions.map((solution, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-fixly-accent rounded-full mt-2 mr-3 flex-shrink-0" />
                  <span className="text-fixly-text-light text-sm">{solution}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <button
              onClick={() => router.push(errorDetails.actionPath)}
              className="btn-primary w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {errorDetails.action}
            </button>

            {error === 'AccountNotFound' && (
              <button
                onClick={() => router.push('/auth/signin')}
                className="btn-secondary w-full"
              >
                <User className="h-4 w-4 mr-2" />
                Try Different Account
              </button>
            )}

            <button
              onClick={() => router.push('/')}
              className="btn-ghost w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </button>
          </div>

          {/* Additional Help */}
          <div className="mt-8 pt-6 border-t border-fixly-border">
            <p className="text-fixly-text-muted text-sm mb-4">
              Still having trouble? We're here to help!
            </p>
            
            <div className="flex gap-2">
              <a
                href="mailto:blessancorley@gmail.com"
                className="btn-secondary flex-1 text-sm"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Support
              </a>
              <button
                onClick={() => router.push('/contact')}
                className="btn-secondary flex-1 text-sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Contact Us
              </button>
            </div>
          </div>
        </motion.div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 card bg-gray-50"
          >
            <h3 className="font-semibold text-gray-800 mb-2">Debug Information:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Error:</strong> {error || 'Unknown'}</p>
              <p><strong>URL:</strong> {window.location.href}</p>
              <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}