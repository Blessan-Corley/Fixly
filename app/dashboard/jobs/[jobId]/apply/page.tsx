'use client';

import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { RoleGuard } from '@/app/providers';
import { GlobalLoading } from '@/components/ui/GlobalLoading';

import ApplyApplicationForm from './ApplyApplicationForm';
import ApplySidebar from './ApplySidebar';
import { useJobApply } from './useJobApply';

export default function JobApplyPage() {
  return (
    <RoleGuard roles={['fixer']} fallback={<div>Access denied</div>}>
      <JobApplyContent />
    </RoleGuard>
  );
}

function JobApplyContent() {
  const router = useRouter();
  const {
    job, loading, hasApplied, showRefreshMessage, pageLoading, globalShowRefreshMessage,
    formData, isSubmitting, totalMaterialCost, remainingCredits, planType, userSkills,
    setFormData, addMaterialItem, removeMaterialItem, updateMaterialItem, handleFormSubmit,
  } = useJobApply();

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <GlobalLoading
          loading={pageLoading || loading}
          showRefreshMessage={globalShowRefreshMessage || showRefreshMessage}
          message="Loading job application form..."
          fullScreen={false}
          className="min-h-[400px]"
        />
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold text-fixly-text">Application Already Submitted</h1>
          <p className="mb-6 text-fixly-text-light">
            You have already applied to this job. You can view your application status in your
            applications dashboard.
          </p>
          <div className="flex justify-center space-x-4">
            <button onClick={() => router.push('/dashboard/applications')} className="btn-primary">
              View Applications
            </button>
            <button onClick={() => router.push('/dashboard/browse-jobs')} className="btn-secondary">
              Browse More Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-fixly-text">Job Not Found</h1>
          <button onClick={() => router.push('/dashboard/browse-jobs')} className="btn-primary">
            Browse Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center">
        <button
          onClick={() => router.back()}
          className="mr-4 rounded-lg p-2 text-fixly-text-light hover:bg-fixly-bg hover:text-fixly-text"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-fixly-text">Apply to Job</h1>
          <p className="text-fixly-text-light">Create a compelling proposal to win this job</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ApplyApplicationForm
            job={job}
            formData={formData}
            isSubmitting={isSubmitting}
            totalMaterialCost={totalMaterialCost}
            setFormData={setFormData}
            addMaterialItem={addMaterialItem}
            removeMaterialItem={removeMaterialItem}
            updateMaterialItem={updateMaterialItem}
            onSubmit={handleFormSubmit}
          />
        </div>
        <ApplySidebar
          job={job}
          remainingCredits={remainingCredits}
          planType={planType}
          userSkills={userSkills}
        />
      </div>
    </div>
  );
}
