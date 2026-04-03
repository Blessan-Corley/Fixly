'use client';

import type { ReactNode } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

import { cn } from '@/lib/utils';

type FormFieldProps = {
  label: string;
  error?: FieldError;
  register?: UseFormRegisterReturn;
  className?: string;
  children: ReactNode;
};

export function FormField({
  label,
  error,
  register,
  className,
  children,
}: FormFieldProps): JSX.Element {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-fixly-text">{label}</label>
      {register && !children ? <input {...register} className="input-field" /> : children}
      {error?.message ? <p className="text-xs text-red-600">{error.message}</p> : null}
    </div>
  );
}
