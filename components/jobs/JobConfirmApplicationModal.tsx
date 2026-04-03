'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Loader, X } from 'lucide-react';

import type { ExtendedUserPlan, JobDetails } from '../../app/dashboard/jobs/[jobId]/page.types';

type UserLike = {
  plan?: ExtendedUserPlan;
};

type JobConfirmApplicationModalProps = {
  isOpen: boolean;
  job: Pick<JobDetails, 'title' | 'budget' | 'location' | 'deadline'>;
  user?: UserLike | null;
  applying: boolean;
  onCancel: () => void;
  onCustomize: () => void;
  onConfirm: () => void;
  getTimeRemaining: (deadline?: string | Date) => string;
};

export default function JobConfirmApplicationModal({
  isOpen,
  job,
  user,
  applying,
  onCancel,
  onCustomize,
  onConfirm,
  getTimeRemaining,
}: JobConfirmApplicationModalProps) {
  const defaultAmount = job.budget.type === 'negotiable' ? 1000 : job.budget.amount || 1000;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-fixly-text">Confirm Application</h2>
              <button
                type="button"
                onClick={onCancel}
                className="text-fixly-text-muted hover:text-fixly-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-fixly-bg p-4">
                <h3 className="mb-2 font-medium text-fixly-text">{job.title}</h3>
                <div className="space-y-1 text-sm text-fixly-text-muted">
                  <p>
                    Budget:{' '}
                    {job.budget.type === 'negotiable'
                      ? 'Negotiable'
                      : `Rs ${job.budget.amount?.toLocaleString()}`}
                  </p>
                  <p>
                    Location: {job.location.city}, {job.location.state}
                  </p>
                  <p>Deadline: {getTimeRemaining(job.deadline)}</p>
                  {job.budget.type === 'negotiable' && (
                    <p className="font-medium text-fixly-accent">
                      This job requires price negotiation
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-fixly-text">You&apos;re applying with:</h4>
                <div className="space-y-1 text-sm text-fixly-text-muted">
                  <p>Proposed Amount: Rs {defaultAmount.toLocaleString()}</p>
                  <p>
                    Cover Letter: &quot;I am interested in this job and would like to discuss the
                    details.&quot;
                  </p>
                </div>
              </div>

              {user?.plan?.type !== 'pro' && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <div className="flex items-center text-orange-800">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    <span className="text-sm">
                      This will use 1 of your {3 - (user?.plan?.creditsUsed || 0)} remaining free
                      applications.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex space-x-3">
              <button type="button" onClick={onCancel} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="button" onClick={onCustomize} className="btn-ghost flex-1">
                Customize
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={applying}
                className="btn-primary flex-1"
              >
                {applying ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Confirm Apply'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
