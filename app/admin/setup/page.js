// app/admin/setup/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Loader, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    setupKey: '',
    name: '',
    username: '',
    email: '',
    password: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.username || !formData.email || !formData.password || !formData.setupKey) {
      toast.error('All fields are required');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupKey: formData.setupKey,
          adminData: {
            name: formData.name,
            username: formData.username,
            email: formData.email,
            password: formData.password
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Admin account created successfully!');
        setTimeout(() => {
          router.push('/auth/signin?message=admin_created');
        }, 2000);
      } else {
        toast.error(data.message || 'Failed to create admin account');
      }
    } catch (error) {
      console.error('Admin setup error:', error);
      toast.error('Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fixly-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-fixly-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-fixly-text" />
          </div>
          <h1 className="text-3xl font-bold text-fixly-text mb-2">
            Admin Setup
          </h1>
          <p className="text-fixly-text-light">
            Create the first admin account for Fixly
          </p>
        </motion.div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Setup Key *
              </label>
              <input
                type="password"
                value={formData.setupKey}
                onChange={(e) => handleInputChange('setupKey', e.target.value)}
                placeholder="Enter setup key from environment"
                className="input-field"
                required
              />
              <p className="text-xs text-fixly-text-muted mt-1">
                Default: fixly_admin_setup_2024_change_this_secret
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Admin Full Name"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Username *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                placeholder="admin"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="admin@fixly.com"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Secure password (min 6 chars)"
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-fixly-text-muted" />
                  ) : (
                    <Eye className="h-5 w-5 text-fixly-text-muted" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center"
            >
              {loading ? (
                <Loader className="animate-spin h-5 w-5 mr-2" />
              ) : (
                <Shield className="h-5 w-5 mr-2" />
              )}
              Create Admin Account
            </button>
          </form>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• This setup can only be used once</li>
              <li>• After admin creation, this page will be disabled</li>
              <li>• Keep your admin credentials secure</li>
              <li>• Access admin panel at /dashboard/admin after login</li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/')}
            className="text-fixly-accent hover:text-fixly-accent-dark"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}