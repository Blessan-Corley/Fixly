'use client';

import { motion } from 'framer-motion';
import { Loader, Send } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import type { ApplicationFormData } from '../_lib/jobDetails.types';

type JobApplicationFormCardProps = {
  data: ApplicationFormData;
  applying: boolean;
  setData: Dispatch<SetStateAction<ApplicationFormData>>;
  onSubmit: () => void;
  onCancel: () => void;
};

export function JobApplicationFormCard({
  data,
  applying,
  setData,
  onSubmit,
  onCancel,
}: JobApplicationFormCardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="card"
    >
      <h2 className="mb-4 text-xl font-bold text-fixly-text">Apply for this Job</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Your Proposed Amount (Rs.)
          </label>
          <input
            type="number"
            value={data.proposedAmount}
            onChange={(event) =>
              setData((previousData) => ({
                ...previousData,
                proposedAmount: event.target.value,
              }))
            }
            placeholder="Enter your proposed amount"
            className="input-field"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Estimated Completion Time
          </label>
          <input
            type="text"
            value={data.estimatedTime}
            onChange={(event) =>
              setData((previousData) => ({
                ...previousData,
                estimatedTime: event.target.value,
              }))
            }
            placeholder="e.g., 3-5 days, 1 week"
            className="input-field"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">Cover Message</label>
          <textarea
            value={data.message}
            onChange={(event) =>
              setData((previousData) => ({
                ...previousData,
                message: event.target.value,
              }))
            }
            placeholder="Tell the client why you're the right person for this job..."
            rows={4}
            className="textarea-field"
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={applying || !data.proposedAmount || !data.message}
            className="btn-primary flex-1"
          >
            {applying ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit Application
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}
