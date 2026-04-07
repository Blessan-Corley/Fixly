'use client';

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

export interface UseAdminSetupPageReturn {
  loading: boolean;
  showPassword: boolean;
  formData: AdminSetupFormData;
  togglePasswordVisibility: () => void;
  handleInputChange: <K extends keyof AdminSetupFormData>(field: K, value: AdminSetupFormData[K]) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  goHome: () => void;
}

export function useAdminSetupPage(): UseAdminSetupPageReturn {
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
    value: AdminSetupFormData[K],
  ): void => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
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
        responseData.message ?? getResponseMessage(payload, 'Failed to create admin account'),
      );
    } catch (setupError) {
      console.error('Admin setup error:', setupError);
      toast.error('Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    showPassword,
    formData,
    togglePasswordVisibility: () => setShowPassword((prev) => !prev),
    handleInputChange,
    handleSubmit,
    goHome: () => router.push('/'),
  };
}
