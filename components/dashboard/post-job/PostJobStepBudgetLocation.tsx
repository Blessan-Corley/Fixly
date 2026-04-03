'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Clock, DollarSign } from 'lucide-react';
import dynamic from 'next/dynamic';

import type { FormErrors, JobLocation, PostJobFormData } from '../../../types/jobs/post-job';

const EnhancedLocationSelector = dynamic(
  () => import('../../LocationPicker/EnhancedLocationSelector'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-fixly-border p-4 text-sm text-fixly-text-muted">
        Loading location picker...
      </div>
    ),
  }
);

interface PostJobStepBudgetLocationProps {
  errors: FormErrors;
  formData: PostJobFormData;
  onBudgetAmountChange: (value: string) => void;
  onBudgetMaterialsIncludedChange: (value: boolean) => void;
  onBudgetTypeChange: (value: PostJobFormData['budget']['type']) => void;
  onLocationChange: (location: JobLocation) => void;
}

const toJobLocation = (location: unknown): JobLocation => {
  const locationValue = location as {
    address?: string;
    city?: string;
    components?: { city?: string; pincode?: string; state?: string };
    coordinates?: { lat?: number; lng?: number };
    formatted?: string;
    lat?: number;
    lng?: number;
    pincode?: string;
    state?: string;
  };

  return {
    _original: location,
    address:
      typeof locationValue?.address === 'string'
        ? locationValue.address
        : typeof locationValue?.formatted === 'string'
          ? locationValue.formatted
          : '',
    city:
      typeof locationValue?.components?.city === 'string'
        ? locationValue.components.city
        : typeof locationValue?.city === 'string'
          ? locationValue.city
          : '',
    lat:
      typeof locationValue?.lat === 'number'
        ? locationValue.lat
        : typeof locationValue?.coordinates?.lat === 'number'
          ? locationValue.coordinates.lat
          : null,
    lng:
      typeof locationValue?.lng === 'number'
        ? locationValue.lng
        : typeof locationValue?.coordinates?.lng === 'number'
          ? locationValue.coordinates.lng
          : null,
    pincode:
      typeof locationValue?.components?.pincode === 'string'
        ? locationValue.components.pincode
        : typeof locationValue?.pincode === 'string'
          ? locationValue.pincode
          : '',
    state:
      typeof locationValue?.components?.state === 'string'
        ? locationValue.components.state
        : typeof locationValue?.state === 'string'
          ? locationValue.state
          : '',
  };
};

export default function PostJobStepBudgetLocation({
  errors,
  formData,
  onBudgetAmountChange,
  onBudgetMaterialsIncludedChange,
  onBudgetTypeChange,
  onLocationChange,
}: PostJobStepBudgetLocationProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="mb-4 text-xl font-semibold text-fixly-text">Budget & Location</h2>
        <p className="mb-6 text-fixly-text-light">Set your budget and specify the job location</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">Budget Type *</label>
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              { value: 'fixed', label: 'Fixed Price', icon: DollarSign },
              { value: 'hourly', label: 'Per Hour', icon: Clock },
              { value: 'negotiable', label: 'Negotiable', icon: AlertCircle },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onBudgetTypeChange(value)}
              className={`rounded-lg border-2 p-4 transition-colors ${
                formData.budget.type === value
                  ? 'border-fixly-accent bg-fixly-accent/10'
                  : 'border-fixly-border hover:border-fixly-accent'
              }`}
            >
              <Icon className="mx-auto mb-2 h-6 w-6 text-fixly-accent" />
              <div className="font-medium text-fixly-text">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {formData.budget.type !== 'negotiable' && (
        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Budget Amount (â‚¹) *
          </label>
          <input
            type="number"
            value={formData.budget.amount}
            onChange={(e) => onBudgetAmountChange(e.target.value)}
            placeholder="Enter amount"
            className={`input-field ${errors['budget.amount'] ? 'border-red-500 focus:border-red-500' : ''}`}
            min="1"
          />
          {errors['budget.amount'] && (
            <p className="mt-1 text-sm text-red-500">{errors['budget.amount']}</p>
          )}
        </div>
      )}

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.budget.materialsIncluded}
            onChange={(e) => onBudgetMaterialsIncludedChange(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm text-fixly-text">Materials and supplies included in budget</span>
        </label>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">
          Job Location <span className="text-red-500">*</span>
        </label>
        <p className="mb-4 text-xs text-fixly-text-light">
          Provide the complete address where the work needs to be done. We&apos;ll use GPS to help
          auto-fill details.
        </p>

        <EnhancedLocationSelector
          initialLocation={{
            ...formData.location,
            lat: formData.location.lat ?? undefined,
            lng: formData.location.lng ?? undefined,
          }}
          onLocationSelect={(location) => {
            onLocationChange(toJobLocation(location));
          }}
          required={true}
          className="w-full"
        />

        {errors['location.address'] && (
          <p className="mt-1 text-sm text-red-500">{errors['location.address']}</p>
        )}
      </div>
    </motion.div>
  );
}
