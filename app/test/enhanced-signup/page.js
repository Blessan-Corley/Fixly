'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  MapPin,
  Settings as Tool,
  Mail,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import SignupPage from '../../auth/signup/page';

export default function EnhancedSignupTestPage() {
  const [testMode, setTestMode] = useState('hirer');
  const [showDemo, setShowDemo] = useState(true);

  const toggleRole = () => {
    setTestMode(testMode === 'hirer' ? 'fixer' : 'hirer');
  };

  const resetDemo = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-fixly-bg">
      {/* Test Controls Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-fixly-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2"
              >
                <UserPlus className="h-5 w-5 text-fixly-accent" />
                <h1 className="text-lg font-semibold text-fixly-text">
                  Enhanced Signup Flow Test
                </h1>
              </motion.div>

              <div className="flex items-center space-x-2 text-sm text-fixly-text-muted">
                <span>Testing as:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  testMode === 'hirer'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {testMode.charAt(0).toUpperCase() + testMode.slice(1)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={toggleRole}
                className="btn-ghost flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Switch to {testMode === 'hirer' ? 'Fixer' : 'Hirer'}</span>
              </button>

              <button
                onClick={resetDemo}
                className="btn-ghost flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reset Demo</span>
              </button>

              <button
                onClick={() => setShowDemo(!showDemo)}
                className="btn-primary flex items-center space-x-2"
              >
                {showDemo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{showDemo ? 'Hide' : 'Show'} Info</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 p-6 max-w-7xl mx-auto">
        {/* Demo Information Panel */}
        {showDemo && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="xl:col-span-1 space-y-6"
          >
            {/* Features Overview */}
            <div className="card">
              <h2 className="text-xl font-semibold text-fixly-text mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Enhanced Features
              </h2>

              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Multi-Step Flow</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Google OAuth & Email options</li>
                    <li>• Email verification with OTP</li>
                    <li>• Password validation</li>
                    <li>• Username availability check</li>
                    <li>• Phone number validation</li>
                    <li>• GPS-powered address form</li>
                    {testMode === 'fixer' && <li>• Comprehensive skills selection</li>}
                  </ul>
                </div>

                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">Smart Location</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• GPS auto-detection</li>
                    <li>• Manual address entry</li>
                    <li>• Google Maps integration</li>
                    <li>• India-only boundaries</li>
                    <li>• Address caching & tracking</li>
                  </ul>
                </div>

                {testMode === 'fixer' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <h3 className="font-medium text-purple-900 mb-2">Skills System</h3>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Categorized skill selection</li>
                      <li>• Search & filter options</li>
                      <li>• Custom skills support</li>
                      <li>• Minimum 3 skills required</li>
                      <li>• Visual skill management</li>
                    </ul>
                  </div>
                )}

                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <h3 className="font-medium text-orange-900 mb-2">Security & UX</h3>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Rate limiting protection</li>
                    <li>• Real-time validation</li>
                    <li>• Progress indicators</li>
                    <li>• Mobile responsive design</li>
                    <li>• Accessibility features</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Test Instructions */}
            <div className="card">
              <h2 className="text-xl font-semibold text-fixly-text mb-4">
                Test Instructions
              </h2>

              <div className="space-y-4">
                <div className="step-indicator">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-fixly-accent text-white rounded-full flex items-center justify-center text-xs font-medium">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-fixly-text">Choose Auth Method</h4>
                      <p className="text-sm text-fixly-text-light">
                        Test both Google OAuth and email signup flows
                      </p>
                    </div>
                  </div>
                </div>

                <div className="step-indicator">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-fixly-accent text-white rounded-full flex items-center justify-center text-xs font-medium">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-fixly-text">Email Verification</h4>
                      <p className="text-sm text-fixly-text-light">
                        Use test email: test@example.com (OTP: 123456)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="step-indicator">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-fixly-accent text-white rounded-full flex items-center justify-center text-xs font-medium">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium text-fixly-text">Set Password</h4>
                      <p className="text-sm text-fixly-text-light">
                        Test strong password validation requirements
                      </p>
                    </div>
                  </div>
                </div>

                <div className="step-indicator">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-fixly-accent text-white rounded-full flex items-center justify-center text-xs font-medium">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium text-fixly-text">Personal Details</h4>
                      <p className="text-sm text-fixly-text-light">
                        Test username availability and phone validation
                      </p>
                    </div>
                  </div>
                </div>

                <div className="step-indicator">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-fixly-accent text-white rounded-full flex items-center justify-center text-xs font-medium">
                      5
                    </div>
                    <div>
                      <h4 className="font-medium text-fixly-text">Address Form</h4>
                      <p className="text-sm text-fixly-text-light">
                        Try GPS auto-fill and manual address entry
                      </p>
                    </div>
                  </div>
                </div>

                {testMode === 'fixer' && (
                  <div className="step-indicator">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-fixly-accent text-white rounded-full flex items-center justify-center text-xs font-medium">
                        6
                      </div>
                      <div>
                        <h4 className="font-medium text-fixly-text">Skills Selection</h4>
                        <p className="text-sm text-fixly-text-light">
                          Select skills from categories or add custom ones
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Test Credentials */}
            <div className="card">
              <h2 className="text-xl font-semibold text-fixly-text mb-4">
                Test Credentials
              </h2>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Mail className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Test Email</span>
                  </div>
                  <code className="text-sm text-gray-700">test@example.com</code>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Test OTP</span>
                  </div>
                  <code className="text-sm text-gray-700">123456</code>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Phone className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Test Phone</span>
                  </div>
                  <code className="text-sm text-gray-700">9876543210</code>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Note</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  This is a test environment. No real accounts will be created.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Signup Form */}
        <div className={`${showDemo ? 'xl:col-span-2' : 'xl:col-span-3'} flex justify-center`}>
          <div className="w-full max-w-md">
            {/* Role Indicator */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 text-center"
            >
              <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border-2 ${
                testMode === 'hirer'
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-green-200 bg-green-50 text-green-800'
              }`}>
                {testMode === 'hirer' ? (
                  <MapPin className="h-4 w-4" />
                ) : (
                  <Tool className="h-4 w-4" />
                )}
                <span className="font-medium">
                  Testing {testMode.charAt(0).toUpperCase() + testMode.slice(1)} Signup Flow
                </span>
              </div>
            </motion.div>

            {/* Enhanced Signup Component */}
            <div className="relative">
              {/* Overlay URL params simulation */}
              <div style={{ display: 'none' }}>
                {/* This simulates the URL params for the enhanced signup */}
                {typeof window !== 'undefined' && window.history.replaceState(
                  {},
                  '',
                  `/test/enhanced-signup?role=${testMode}`
                )}
              </div>

              {/* The actual enhanced signup form would be embedded here */}
              <div className="min-h-[600px] flex items-center justify-center">
                <motion.div
                  key={testMode}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  {/* Placeholder for EnhancedSignupPage component */}
                  <div className="card">
                    <div className="text-center py-12">
                      <UserPlus className="h-12 w-12 text-fixly-accent mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-fixly-text mb-2">
                        Enhanced Signup Flow for {testMode.charAt(0).toUpperCase() + testMode.slice(1)}
                      </h3>
                      <p className="text-fixly-text-light mb-6">
                        The enhanced signup component would be integrated here with role-specific flows
                      </p>

                      <div className="space-y-4">
                        <div className="p-4 bg-fixly-accent/10 border border-fixly-accent/20 rounded-lg">
                          <h4 className="font-medium text-fixly-text mb-2">Current Role: {testMode}</h4>
                          <ul className="text-sm text-fixly-text-light text-left space-y-1">
                            <li>✓ Google OAuth & Email authentication</li>
                            <li>✓ Email verification with OTP</li>
                            <li>✓ Strong password validation</li>
                            <li>✓ Username availability checking</li>
                            <li>✓ Indian phone number validation</li>
                            <li>✓ GPS-powered address form</li>
                            {testMode === 'fixer' && <li>✓ Comprehensive skills selection</li>}
                          </ul>
                        </div>

                        <button
                          onClick={() => toast.success(`Enhanced signup flow ready for ${testMode}!`)}
                          className="btn-primary w-full"
                        >
                          Start Enhanced Signup Flow
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 py-6 border-t border-fixly-border bg-fixly-bg">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-fixly-text-muted">
            Enhanced Signup Flow with GPS Location, Skills Selection & Real-time Validation
          </p>
        </div>
      </div>
    </div>
  );
}