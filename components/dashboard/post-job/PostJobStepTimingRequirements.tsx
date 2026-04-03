'use client';

import { motion } from 'framer-motion';
import { type DragEvent } from 'react';

import type {
  FormErrors,
  JobUrgency,
  PostJobFormData,
  UploadProgressMap,
} from '../../../types/jobs/post-job';
import DeadlineSelector from '../../ui/DeadlineSelector';

import { AttachmentUploadZone } from './AttachmentUploadZone';

interface PostJobStepTimingRequirementsProps {
  dragOver: boolean;
  errors: FormErrors;
  formData: PostJobFormData;
  isPro: boolean;
  uploading: boolean;
  uploadProgress: UploadProgressMap;
  onDeadlineChange: (value: string) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileSelect: (files: FileList | null) => void | Promise<void>;
  onOpenProModal: () => void;
  onRemoveAttachment: (attachmentId: string) => void | Promise<void>;
  onScheduledDateChange: (value: string) => void;
  onUrgencyChange: (value: JobUrgency) => void;
}

export default function PostJobStepTimingRequirements({
  dragOver,
  errors,
  formData,
  isPro,
  uploading,
  uploadProgress,
  onDeadlineChange,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileSelect,
  onOpenProModal,
  onRemoveAttachment,
  onScheduledDateChange,
  onUrgencyChange,
}: PostJobStepTimingRequirementsProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="mb-4 text-xl font-semibold text-fixly-text">Timing & Requirements</h2>
        <p className="mb-6 text-fixly-text-light">When do you need this work completed?</p>
      </div>

      {formData.urgency !== 'scheduled' ? (
        <DeadlineSelector
          selectedDeadline={formData.deadline}
          onDeadlineSelect={(deadline) => {
            onDeadlineChange(deadline ? deadline.toISOString().slice(0, 16) : '');
          }}
          userPlan={isPro ? 'pro' : 'free'}
          required={true}
          error={errors.deadline}
          className="mb-6"
        />
      ) : (
        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">Scheduled Date *</label>
          <p className="mb-4 text-xs text-fixly-text-light">
            Set the specific date and time when this job should be started.
          </p>
          <DeadlineSelector
            selectedDeadline={formData.scheduledDate}
            onDeadlineSelect={(scheduledDate) => {
              onScheduledDateChange(scheduledDate ? scheduledDate.toISOString().slice(0, 16) : '');
            }}
            userPlan={isPro ? 'pro' : 'free'}
            required={true}
            error={errors.scheduledDate}
            mode="scheduled"
            className="mb-4"
          />
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">Urgency</label>
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              { value: 'asap', label: 'ASAP', desc: 'Within 24 hours', requiresPro: true },
              { value: 'flexible', label: 'Flexible', desc: 'Within a few days', requiresPro: false },
              { value: 'scheduled', label: 'Scheduled', desc: 'On specific date', requiresPro: false },
            ] as const
          ).map(({ value, label, desc, requiresPro }) => {
            const canSelect = !requiresPro || isPro;

            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  if (requiresPro && !isPro) {
                    onOpenProModal();
                  } else {
                    onUrgencyChange(value);
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
                    {isPro ? 'Pro' : 'Pro Required'}
                  </div>
                )}
                <div className="text-sm text-fixly-text-muted">{desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <AttachmentUploadZone
        dragOver={dragOver}
        errors={errors}
        formData={formData}
        uploading={uploading}
        uploadProgress={uploadProgress}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onFileSelect={onFileSelect}
        onRemoveAttachment={onRemoveAttachment}
      />
    </motion.div>
  );
}
