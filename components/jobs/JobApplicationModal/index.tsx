'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Loader, X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import type { JobApplicationFormData } from '../../../app/dashboard/jobs/[jobId]/page.helpers';
import type { JobDetails } from '../../../app/dashboard/jobs/[jobId]/page.types';

import {
  CoverLetterSection,
  MaterialsBannerSection,
  ProposedAmountSection,
  RequirementsNotesSection,
  TimeEstimateSection,
  WorkPlanSection,
} from './ApplicationFormFields';
import BudgetBreakdownSection from './BudgetBreakdownSection';
import JobSummaryCard from './JobSummaryCard';
import MaterialsListSection from './MaterialsListSection';
import ProposalSummary from './ProposalSummary';

type JobApplicationModalProps = {
  isOpen: boolean;
  job: Pick<JobDetails, 'title' | 'budget' | 'location' | 'deadline'>;
  applicationData: JobApplicationFormData;
  setApplicationData: Dispatch<SetStateAction<JobApplicationFormData>>;
  applying: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function JobApplicationModal({
  isOpen,
  job,
  applicationData,
  setApplicationData,
  applying,
  onClose,
  onSubmit,
}: JobApplicationModalProps): React.JSX.Element {
  const isSubmitDisabled =
    applying ||
    !applicationData.proposedAmount ||
    !applicationData.coverLetter ||
    !applicationData.workPlan;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-fixly-border bg-fixly-card p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-fixly-text">Apply for Job</h2>
              <button onClick={onClose} className="text-fixly-text-muted hover:text-fixly-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <JobSummaryCard job={job} />

              <ProposedAmountSection
                applicationData={applicationData}
                setApplicationData={setApplicationData}
                budget={job.budget}
              />

              <BudgetBreakdownSection
                applicationData={applicationData}
                setApplicationData={setApplicationData}
                materialsIncluded={job.budget.materialsIncluded}
              />

              <MaterialsBannerSection materialsIncluded={job.budget.materialsIncluded} />

              <TimeEstimateSection
                applicationData={applicationData}
                setApplicationData={setApplicationData}
              />

              <WorkPlanSection
                applicationData={applicationData}
                setApplicationData={setApplicationData}
                budgetType={job.budget.type}
              />

              <CoverLetterSection
                applicationData={applicationData}
                setApplicationData={setApplicationData}
              />

              <RequirementsNotesSection
                applicationData={applicationData}
                setApplicationData={setApplicationData}
              />

              <MaterialsListSection
                materialsList={applicationData.materialsList}
                setApplicationData={setApplicationData}
              />

              <ProposalSummary
                applicationData={applicationData}
                materialsIncluded={job.budget.materialsIncluded}
              />
            </div>

            <div className="mt-6 flex space-x-3">
              <button onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={onSubmit} disabled={isSubmitDisabled} className="btn-primary flex-1">
                {applying ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
