'use client';

import { motion } from 'framer-motion';
import { AlertCircle, FileText } from 'lucide-react';
import Image from 'next/image';

import type { PostJobFormData } from '../../../types/jobs/post-job';

interface PostJobStepReviewSubmitProps {
  formData: PostJobFormData;
  formatScheduleDisplay: (data: PostJobFormData) => string;
}

export default function PostJobStepReviewSubmit({
  formData,
  formatScheduleDisplay,
}: PostJobStepReviewSubmitProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="mb-4 text-xl font-semibold text-fixly-text">Review & Submit</h2>
        <p className="mb-6 text-fixly-text-light">Review your job details before posting</p>
      </div>

      <div className="card">
        <h3 className="mb-4 font-semibold text-fixly-text">Job Summary</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-fixly-text">{formData.title}</h4>
            <p className="mt-1 text-sm text-fixly-text-muted">
              {formData.description.substring(0, 200)}...
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <span className="font-medium">Skills:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {formData.skillsRequired.map((skill, index) => (
                  <span key={index} className="skill-chip text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="font-medium">Budget:</span>
              <p className="text-fixly-text-muted">
                {formData.budget.type === 'negotiable'
                  ? 'Negotiable'
                  : `INR ${formData.budget.amount} (${formData.budget.type})`}
              </p>
            </div>

            <div>
              <span className="font-medium">Location:</span>
              <p className="text-fixly-text-muted">
                {formData.location.city}, {formData.location.state}
              </p>
            </div>

            <div>
              <span className="font-medium">
                {formData.urgency === 'scheduled' ? 'Scheduled Date:' : 'Deadline:'}
              </span>
              <p className="text-fixly-text-muted">{formatScheduleDisplay(formData)}</p>
            </div>

            <div>
              <span className="font-medium">Urgency:</span>
              <p className="capitalize text-fixly-text-muted">
                {formData.urgency === 'asap' ? 'ASAP' : formData.urgency}
              </p>
            </div>
          </div>

          {formData.attachments.length > 0 && (
            <div className="mt-6">
              <span className="mb-3 block font-medium">
                Attachments ({formData.attachments.length})
              </span>
              <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
                {formData.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="bg-fixly-surface relative overflow-hidden rounded-lg"
                  >
                    {attachment.isImage ? (
                      <Image
                        src={attachment.url}
                        alt={attachment.name}
                        width={640}
                        height={256}
                        unoptimized
                        className="h-16 w-full object-cover"
                      />
                    ) : (
                      <div className="bg-fixly-surface flex h-16 w-full items-center justify-center">
                        <FileText className="h-6 w-6 text-fixly-accent" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-white dark:bg-black/80">
                      <p className="truncate text-xs">{attachment.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-start">
          <AlertCircle className="mr-2 mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-500" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Rate Limit Notice</p>
            <p className="mt-1 text-yellow-700 dark:text-yellow-300">
              Free users can post another job in 3 hours. Upgrade to Pro for unlimited posting!
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
