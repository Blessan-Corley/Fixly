'use client';

import { motion } from 'framer-motion';
import { Shield, MapPin, Users, Database, Lock, Heart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LocationPrivacyPage() {
  return (
    <div className="min-h-screen bg-fixly-bg py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Back Button */}
        <Link 
          href="/privacy" 
          className="inline-flex items-center text-fixly-accent hover:text-fixly-accent-dark mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Privacy Policy
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 bg-fixly-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="h-8 w-8 text-fixly-accent" />
          </div>
          <h1 className="text-4xl font-bold text-fixly-text mb-4">
            🎯 Location Services
          </h1>
          <p className="text-fixly-text-light text-lg">
            How we use your location to connect you with amazing opportunities nearby
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Why We Use Location */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <div className="flex items-center mb-6">
              <Heart className="h-6 w-6 text-fixly-accent mr-3" />
              <h2 className="text-2xl font-bold text-fixly-text">
                Why We Love Using Your Location (And Why You Will Too!)
              </h2>
            </div>
            
            <div className="space-y-6">
              <p className="text-fixly-text-light text-lg leading-relaxed">
                <strong className="text-fixly-accent">Your location helps us be your personal job-hunting assistant!</strong> 
                Instead of showing you jobs that are hours away, we prioritize opportunities that are actually convenient for you.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🚗</span>
                  </div>
                  <h3 className="font-bold text-green-800 mb-2">Save Travel Time</h3>
                  <p className="text-green-700 text-sm">Find jobs within your preferred commute distance - whether that's walking distance or a short drive!</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h3 className="font-bold text-blue-800 mb-2">Save Money</h3>
                  <p className="text-blue-700 text-sm">Reduce fuel costs and transportation expenses by working closer to home.</p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🏠</span>
                  </div>
                  <h3 className="font-bold text-purple-800 mb-2">Work-Life Balance</h3>
                  <p className="text-purple-700 text-sm">Spend more time with family and less time commuting with local job opportunities.</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* How We Use Location */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center mb-6">
              <Database className="h-6 w-6 text-fixly-accent mr-3" />
              <h2 className="text-2xl font-bold text-fixly-text">
                How We Use Your Location to Help You Succeed
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-fixly-text text-lg mb-4 flex items-center">
                    <span className="text-2xl mr-2">🎯</span>
                    Smart Job Matching
                  </h4>
                  <ul className="space-y-3 text-fixly-text-light">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      Show jobs closest to you first
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      Calculate exact travel distances
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      Filter jobs within your preferred radius
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      Suggest jobs in areas you frequently visit
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-fixly-text text-lg mb-4 flex items-center">
                    <span className="text-2xl mr-2">📱</span>
                    Helpful Notifications
                  </h4>
                  <ul className="space-y-3 text-fixly-text-light">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      Alert you about great nearby jobs
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      Notify when jobs match your location preferences
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      Send reminders about applications in your area
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      Share location-specific job market insights
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Your Privacy & Control */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card bg-fixly-accent/5 border-fixly-accent/20"
          >
            <div className="flex items-center mb-6">
              <Shield className="h-6 w-6 text-fixly-accent mr-3" />
              <h2 className="text-2xl font-bold text-fixly-text">
                Your Privacy & Control - You're Always in Charge!
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold text-fixly-accent text-lg mb-4">🛡️ What We Promise:</h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <span className="text-green-500 mr-3 text-xl">✅</span>
                    <div>
                      <strong>Your exact address stays private</strong> - we only use coordinates for distance calculations
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-3 text-xl">✅</span>
                    <div>
                      <strong>You control when to share</strong> - location sharing is always optional
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-3 text-xl">✅</span>
                    <div>
                      <strong>Secure storage</strong> - encrypted with bank-level security
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-3 text-xl">✅</span>
                    <div>
                      <strong>Delete anytime</strong> - clear your location data whenever you want
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-red-500 text-lg mb-4">🚫 We Will Never:</h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <span className="text-red-500 mr-3 text-xl">❌</span>
                    <div>
                      <strong>Share your location</strong> with other users or employers
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-red-500 mr-3 text-xl">❌</span>
                    <div>
                      <strong>Sell your data</strong> to advertisers or third parties
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-red-500 mr-3 text-xl">❌</span>
                    <div>
                      <strong>Track you secretly</strong> - you'll always know when we're using location
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-red-500 mr-3 text-xl">❌</span>
                    <div>
                      <strong>Use location for ads</strong> - we don't show location-based advertisements
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Simple Controls */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card bg-gradient-to-r from-fixly-accent/10 to-blue-50"
          >
            <h2 className="text-2xl font-bold text-fixly-text mb-6 text-center">
              🎛️ Simple Location Controls
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="text-3xl mb-3">📍</div>
                <h4 className="font-semibold text-fixly-text mb-2">Enable/Disable</h4>
                <p className="text-sm text-fixly-text-light">Turn location services on or off with one click</p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="text-3xl mb-3">📏</div>
                <h4 className="font-semibold text-fixly-text mb-2">Set Radius</h4>
                <p className="text-sm text-fixly-text-light">Choose your preferred job search distance</p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="text-3xl mb-3">🔄</div>
                <h4 className="font-semibold text-fixly-text mb-2">Auto-Update</h4>
                <p className="text-sm text-fixly-text-light">Control automatic location refreshing</p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="text-3xl mb-3">🗑️</div>
                <h4 className="font-semibold text-fixly-text mb-2">Clear Data</h4>
                <p className="text-sm text-fixly-text-light">Delete your location history anytime</p>
              </div>
            </div>
          </motion.section>

          {/* CTA Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center py-8"
          >
            <h2 className="text-2xl font-bold text-fixly-text mb-4">
              Ready to Find Amazing Jobs Near You?
            </h2>
            <p className="text-fixly-text-light mb-8 text-lg">
              Enable location services and start discovering opportunities in your neighborhood today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard/browse-jobs" className="btn-primary text-lg px-8 py-4">
                🎯 Find Jobs Near Me
              </Link>
              <Link href="/dashboard/settings" className="btn-secondary text-lg px-8 py-4">
                ⚙️ Location Settings
              </Link>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}