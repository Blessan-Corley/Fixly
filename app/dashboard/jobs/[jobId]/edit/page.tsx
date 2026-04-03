'use client';
import { AlertCircle, ArrowLeft, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

import { RoleGuard } from '../../../../providers';

import EditJobFormCard from './EditJobFormCard';
import EditProModal from './EditProModal';
import { useEditJob } from './useEditJob';

type PageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export default function EditJobPage(props: PageProps): JSX.Element {
  const params = use(props.params);
  return (
    <RoleGuard roles={['hirer']} fallback={<div>Access denied</div>}>
      <EditJobContent params={params} />
    </RoleGuard>
  );
}

function EditJobContent({ params }: { params: { jobId: string } }): JSX.Element | null {
  const { jobId } = params;
  const router = useRouter();

  const {
    formData,
    loading,
    saving,
    errors,
    originalJob,
    showProModal,
    isPro,
    loadingSubscription,
    setShowProModal,
    handleInputChange,
    handleSubmit,
    addSkill,
    removeSkill,
    selectCity,
  } = useEditJob(jobId);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
        </div>
      </div>
    );
  }

  if (!originalJob) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-fixly-text">Job Not Found</h2>
          <p className="mb-4 text-fixly-text-muted">
            The job you&apos;re trying to edit doesn&apos;t exist or you don&apos;t have permission
            to edit it.
          </p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center">
        <button
          onClick={() => router.push(`/dashboard/jobs/${jobId}`)}
          className="btn-ghost mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Job
        </button>
        <div>
          <h1 className="text-2xl font-bold text-fixly-text">Edit Job</h1>
          <p className="text-fixly-text-light">Make changes to your job posting</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        <EditJobFormCard
          formData={formData}
          errors={errors}
          saving={saving}
          isPro={isPro}
          loadingSubscription={loadingSubscription}
          onInputChange={handleInputChange}
          onAddSkill={addSkill}
          onRemoveSkill={removeSkill}
          onSelectCity={selectCity}
          onShowProModal={() => setShowProModal(true)}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/dashboard/jobs/${jobId}`)}
        />
      </div>

      {showProModal && <EditProModal onClose={() => setShowProModal(false)} />}
    </div>
  );
}
