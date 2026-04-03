'use client';

import { Briefcase, Star } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import type { JobApplicationFormData } from '../../../app/dashboard/jobs/[jobId]/page.helpers';

type SetData = Dispatch<SetStateAction<JobApplicationFormData>>;

// ─── WorkPlanSection ──────────────────────────────────────────────────────────

export function WorkPlanSection({
  applicationData,
  setApplicationData,
  budgetType,
}: {
  applicationData: JobApplicationFormData;
  setApplicationData: SetData;
  budgetType?: string;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-fixly-border/50 bg-fixly-bg-secondary/20 p-4">
      <label className="mb-3 block flex items-center text-sm font-semibold text-fixly-text">
        <Briefcase className="mr-2 h-4 w-4 text-fixly-accent" />
        Work Plan &amp; Approach *
        {budgetType === 'negotiable' && (
          <span className="ml-2 rounded-full bg-fixly-accent-bg px-2 py-1 text-xs text-fixly-accent">
            Detailed plan required
          </span>
        )}
      </label>
      <textarea
        rows={5}
        value={applicationData.workPlan}
        onChange={(e) => setApplicationData((prev) => ({ ...prev, workPlan: e.target.value }))}
        className="textarea-field"
        placeholder={
          budgetType === 'negotiable'
            ? 'Describe your detailed approach, steps, tools, and timeline.'
            : 'Explain your approach and steps to complete this job.'
        }
        maxLength={1500}
        required
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-fixly-text-muted">Be specific - clients prefer detailed plans.</p>
        <p className="font-mono text-xs text-fixly-text-muted">
          {applicationData.workPlan.length}/1500
        </p>
      </div>
    </div>
  );
}

// ─── CoverLetterSection ───────────────────────────────────────────────────────

export function CoverLetterSection({
  applicationData,
  setApplicationData,
}: {
  applicationData: JobApplicationFormData;
  setApplicationData: SetData;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-fixly-border/50 bg-fixly-bg-secondary/20 p-4">
      <label className="mb-3 block flex items-center text-sm font-semibold text-fixly-text">
        <Star className="mr-2 h-4 w-4 text-fixly-accent" />
        Why Choose You? *
      </label>
      <textarea
        rows={4}
        value={applicationData.coverLetter}
        onChange={(e) =>
          setApplicationData((prev) => ({ ...prev, coverLetter: e.target.value }))
        }
        className="textarea-field"
        placeholder="Highlight relevant experience, skills, and what makes you the best choice."
        maxLength={800}
        required
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-fixly-text-muted">Show your expertise and confidence.</p>
        <p className="font-mono text-xs text-fixly-text-muted">
          {applicationData.coverLetter.length}/800
        </p>
      </div>
    </div>
  );
}

// ─── RequirementsNotesSection ─────────────────────────────────────────────────

export function RequirementsNotesSection({
  applicationData,
  setApplicationData,
}: {
  applicationData: JobApplicationFormData;
  setApplicationData: SetData;
}): React.JSX.Element {
  return (
    <>
      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">
          What You Need from the Client
        </label>
        <textarea
          rows={3}
          value={applicationData.requirements}
          onChange={(e) =>
            setApplicationData((prev) => ({ ...prev, requirements: e.target.value }))
          }
          className="input"
          placeholder="Access, information, permissions, preparations, etc."
          maxLength={500}
        />
        <p className="mt-1 text-xs text-fixly-text-muted">
          {applicationData.requirements.length}/500 characters
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">
          Special Notes &amp; Conditions
        </label>
        <textarea
          rows={2}
          value={applicationData.specialNotes}
          onChange={(e) =>
            setApplicationData((prev) => ({ ...prev, specialNotes: e.target.value }))
          }
          className="input"
          placeholder="Conditions, warranties, follow-up services, or important notes"
          maxLength={300}
        />
        <p className="mt-1 text-xs text-fixly-text-muted">
          {applicationData.specialNotes.length}/300 characters
        </p>
      </div>
    </>
  );
}
