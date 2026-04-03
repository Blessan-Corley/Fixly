'use client';

import { motion } from 'framer-motion';
import { Loader, Save } from 'lucide-react';

import type { CitySearchResult, JobEditFormData, ValidationErrors } from './edit.types';
import EditJobCityField from './EditJobCityField';
import EditJobSkillsField from './EditJobSkillsField';

type EditJobFormCardProps = {
  formData: JobEditFormData;
  errors: ValidationErrors;
  saving: boolean;
  isPro: boolean;
  loadingSubscription: boolean;
  onInputChange: (field: string, value: unknown) => void;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
  onSelectCity: (city: CitySearchResult) => void;
  onShowProModal: () => void;
  onSubmit: () => void;
  onCancel: () => void;
};

const URGENCY_OPTIONS = [
  { value: 'asap', label: 'ASAP', desc: 'Within 24 hours', requiresPro: true },
  { value: 'flexible', label: 'Flexible', desc: 'Within a few days', requiresPro: false },
  { value: 'scheduled', label: 'Scheduled', desc: 'On specific date', requiresPro: false },
] as const;

export default function EditJobFormCard({
  formData,
  errors,
  saving,
  isPro,
  loadingSubscription,
  onInputChange,
  onAddSkill,
  onRemoveSkill,
  onSelectCity,
  onShowProModal,
  onSubmit,
  onCancel,
}: EditJobFormCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card space-y-6"
    >
      {/* Title */}
      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">Job Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onInputChange('title', e.target.value)}
          placeholder="e.g., Fix kitchen sink leak"
          className={`input-field ${errors.title ? 'border-red-500 focus:border-red-500' : ''}`}
          maxLength={100}
        />
        <div className="mt-1 flex justify-between">
          {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          <p className="ml-auto text-xs text-fixly-text-muted">{formData.title.length}/100</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="Describe the work in detail..."
          className={`textarea-field h-32 ${errors.description ? 'border-red-500 focus:border-red-500' : ''}`}
          maxLength={2000}
        />
        <div className="mt-1 flex justify-between">
          {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          <p className="ml-auto text-xs text-fixly-text-muted">
            {formData.description.length}/2000
          </p>
        </div>
      </div>

      {/* Skills */}
      <EditJobSkillsField
        skills={formData.skillsRequired}
        error={errors.skillsRequired}
        onAdd={onAddSkill}
        onRemove={onRemoveSkill}
      />

      {/* Budget */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">Budget Type</label>
          <select
            value={formData.budget.type}
            onChange={(e) => onInputChange('budget.type', e.target.value)}
            className="select-field"
          >
            <option value="negotiable">Negotiable</option>
            <option value="fixed">Fixed Amount</option>
            <option value="hourly">Hourly Rate</option>
          </select>
        </div>

        {formData.budget.type !== 'negotiable' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">Amount (Rs) *</label>
            <input
              type="number"
              value={formData.budget.amount}
              onChange={(e) => onInputChange('budget.amount', e.target.value)}
              placeholder="Enter amount"
              className={`input-field ${errors['budget.amount'] ? 'border-red-500 focus:border-red-500' : ''}`}
              min="0"
            />
            {errors['budget.amount'] && (
              <p className="mt-1 text-sm text-red-500">{errors['budget.amount']}</p>
            )}
          </div>
        )}
      </div>

      {/* Location */}
      <EditJobCityField
        address={formData.location.address}
        city={formData.location.city}
        errors={errors}
        onChange={onInputChange}
        onSelect={onSelectCity}
      />

      {/* Deadline & Urgency */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Application Deadline *
          </label>
          <input
            type="datetime-local"
            value={formData.deadline}
            onChange={(e) => onInputChange('deadline', e.target.value)}
            className={`input-field ${errors.deadline ? 'border-red-500 focus:border-red-500' : ''}`}
            min={new Date().toISOString().slice(0, 16)}
          />
          {errors.deadline && <p className="mt-1 text-sm text-red-500">{errors.deadline}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">Urgency Level</label>
          <div className="grid grid-cols-3 gap-4">
            {URGENCY_OPTIONS.map(({ value, label, desc, requiresPro }) => {
              const canSelect = !requiresPro || isPro;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (requiresPro && !isPro) {
                      onShowProModal();
                    } else {
                      onInputChange('urgency', value);
                    }
                  }}
                  className={`relative rounded-lg border-2 p-4 text-left transition-colors ${
                    formData.urgency === value
                      ? 'border-fixly-accent bg-fixly-accent/10'
                      : canSelect
                        ? 'border-fixly-border hover:border-fixly-accent'
                        : 'border-fixly-border opacity-60'
                  }`}
                >
                  <div className="font-medium text-fixly-text">{label}</div>
                  {requiresPro && (
                    <div className="mt-1 text-xs font-medium text-fixly-accent">
                      {loadingSubscription ? 'Checking plan...' : isPro ? 'Pro' : 'Pro Required'}
                    </div>
                  )}
                  <div className="text-sm text-fixly-text-muted">{desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between border-t border-fixly-border pt-6">
        <button onClick={onCancel} className="btn-ghost" type="button">
          Cancel
        </button>

        <button
          onClick={onSubmit}
          disabled={saving}
          className="btn-primary flex items-center"
          type="button"
        >
          {saving ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </button>
      </div>
    </motion.div>
  );
}
