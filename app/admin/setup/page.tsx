'use client';

import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

type AdminSetupFormData = {
  setupKey: string;
  name: string;
  username: string;
  email: string;
  password: string;
};

type SetupResponse = {
  success?: boolean;
  message?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getResponseMessage = (payload: unknown, fallback: string): string => {
  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }
  return fallback;
};

export default function AdminSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<AdminSetupFormData>({
    setupKey: '',
    name: '',
    username: '',
    email: '',
    password: '',
  });

  const handleInputChange = <K extends keyof AdminSetupFormData>(
    field: K,
    value: AdminSetupFormData[K]
  ) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !formData.name ||
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.setupKey
    ) {
      toast.error('All fields are required');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
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
            password: formData.password,
          },
        }),
      });

      const payload: unknown = await response.json();
      const responseData: SetupResponse = isRecord(payload) ? (payload as SetupResponse) : {};

      if (response.ok) {
        toast.success('Admin account created successfully!');
        setTimeout(() => {
          router.push('/auth/signin?message=admin_created');
        }, 2000);
        return;
      }

      toast.error(
        responseData.message ?? getResponseMessage(payload, 'Failed to create admin account')
      );
    } catch (setupError) {
      console.error('Admin setup error:', setupError);
      toast.error('Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-fixly-bg p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent">
            <Shield className="h-8 w-8 text-fixly-text" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-fixly-text">Admin Setup</h1>
          <p className="text-fixly-text-light">Create the first admin account for Fixly</p>
        </motion.div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Setup Key *</label>
              <input
                type="password"
                value={formData.setupKey}
                onChange={(event) => handleInputChange('setupKey', event.target.value)}
                placeholder="Enter setup key from environment"
                className="input-field"
                required
              />
              <p className="mt-1 text-xs text-fixly-text-muted">Enter the ADMIN KEY</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => handleInputChange('name', event.target.value)}
                placeholder="Admin Full Name"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(event) =>
                  handleInputChange('username', event.target.value.toLowerCase())
                }
                placeholder="admin"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => handleInputChange('email', event.target.value)}
                placeholder="admin@fixly.com"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(event) => handleInputChange('password', event.target.value)}
                  placeholder="Secure password (min 8 chars)"
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform"
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
              className="btn-primary flex w-full items-center justify-center"
            >
              {loading ? (
                <Loader className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Shield className="mr-2 h-5 w-5" />
              )}
              Create Admin Account
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h4 className="mb-2 font-medium text-yellow-800">Important Notes:</h4>
            <ul className="space-y-1 text-sm text-yellow-700">
              <li>- This setup can only be used once</li>
              <li>- After admin creation, this page will be disabled</li>
              <li>- Keep your admin credentials secure</li>
              <li>- Access admin panel at /dashboard/admin after login</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-fixly-accent hover:text-fixly-accent-dark"
          >
            {'<- Back to Home'}
          </button>
        </div>
      </div>
    </div>
  );
}
