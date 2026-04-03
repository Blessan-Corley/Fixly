'use client';

import { useRouter } from 'next/navigation';

import PostJobModals from '../../../components/dashboard/post-job/PostJobModals';
import {
  PostJobCardSection,
  PostJobDraftHeader,
  PostJobNavigation,
  PostJobProgressBar,
  PostJobSubscriptionBanner,
  PostJobValidationSummary,
} from '../../../components/dashboard/post-job/PostJobPageChrome';
import PostJobStepBudgetLocation from '../../../components/dashboard/post-job/PostJobStepBudgetLocation';
import PostJobStepDetails from '../../../components/dashboard/post-job/PostJobStepDetails';
import PostJobStepReviewSubmit from '../../../components/dashboard/post-job/PostJobStepReviewSubmit';
import PostJobStepTimingRequirements from '../../../components/dashboard/post-job/PostJobStepTimingRequirements';
import {
  formatPostJobScheduleDisplay,
  getPostJobErrorFieldLabel,
} from '../../../lib/jobs/post-job-helpers';
import { RoleGuard } from '../../providers';

import { usePostJobContent } from './_hooks/usePostJobContent';

export default function PostJobPage(): React.JSX.Element {
  return (
    <RoleGuard roles={['hirer']} fallback={<div>Access denied</div>}>
      <PostJobContent />
    </RoleGuard>
  );
}

function PostJobContent(): React.JSX.Element {
  const router = useRouter();

  const {
    formData,
    loading,
    errors,
    currentStep,
    totalSteps,
    showProModal,
    subscriptionInfo,
    drafts,
    media,
    fieldValidations,
    validationMessages,
    setShowProModal,
    handleInputChange,
    handleNext,
    handlePrevious,
    handleSubmit,
  } = usePostJobContent();

  const {
    availableDrafts,
    cancelDeleteDraft,
    closeDraftModal,
    confirmDeleteDraft,
    draftStatus,
    draftToDelete,
    hasUnsavedChanges,
    lastSaved,
    loadDraft,
    loadingDrafts,
    openDraftModal,
    requestDeleteDraft,
    saveDraft,
    showDeleteConfirm,
    showDraftModal,
  } = drafts;

  const {
    dragOver,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    removeAttachment,
    uploading,
    uploadProgress,
  } = media;

  const isPro = Boolean(subscriptionInfo?.plan.isActive);

  const renderStep1 = (): React.JSX.Element => (
    <PostJobStepDetails
      formData={formData}
      errors={errors}
      fieldValidations={fieldValidations}
      validationMessages={validationMessages}
      onTitleChange={(value) => handleInputChange('title', value)}
      onDescriptionChange={(value) => handleInputChange('description', value)}
      onSkillsChange={(skills) => handleInputChange('skillsRequired', skills)}
    />
  );

  const renderStep2 = (): React.JSX.Element => (
    <PostJobStepBudgetLocation
      errors={errors}
      formData={formData}
      onBudgetTypeChange={(value) => handleInputChange('budget.type', value)}
      onBudgetAmountChange={(value) => handleInputChange('budget.amount', value)}
      onBudgetMaterialsIncludedChange={(value) =>
        handleInputChange('budget.materialsIncluded', value)
      }
      onLocationChange={(location) => handleInputChange('location', location)}
    />
  );

  const renderStep3 = (): React.JSX.Element => (
    <PostJobStepTimingRequirements
      formData={formData}
      errors={errors}
      dragOver={dragOver}
      uploading={uploading}
      uploadProgress={uploadProgress}
      isPro={isPro}
      onDeadlineChange={(value) => handleInputChange('deadline', value)}
      onScheduledDateChange={(value) => handleInputChange('scheduledDate', value)}
      onUrgencyChange={(value) => handleInputChange('urgency', value)}
      onOpenProModal={() => setShowProModal(true)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onFileSelect={handleFileSelect}
      onRemoveAttachment={removeAttachment}
    />
  );

  const renderStep4 = (): React.JSX.Element => (
    <PostJobStepReviewSubmit
      formData={formData}
      formatScheduleDisplay={formatPostJobScheduleDisplay}
    />
  );

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <PostJobDraftHeader
        availableDraftCount={availableDrafts.length}
        draftStatus={draftStatus}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSaved={lastSaved}
        onOpenDraftModal={openDraftModal}
        onSaveDraft={() => {
          void saveDraft('manual');
        }}
      />

      <PostJobProgressBar currentStep={currentStep} totalSteps={totalSteps} />

      <PostJobCardSection>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </PostJobCardSection>

      <PostJobValidationSummary errors={errors} getFieldLabel={getPostJobErrorFieldLabel} />

      <PostJobNavigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        loading={loading}
        onNext={() => {
          void handleNext();
        }}
        onPrevious={handlePrevious}
        onSubmit={() => {
          void handleSubmit();
        }}
      />

      <PostJobSubscriptionBanner
        subscriptionInfo={subscriptionInfo ?? null}
        onUpgrade={() => {
          router.push('/dashboard/subscription');
        }}
      />

      <PostJobModals
        showProModal={showProModal}
        onCloseProModal={() => setShowProModal(false)}
        onUpgradeToPro={() => {
          setShowProModal(false);
          router.push('/dashboard/subscription');
        }}
        showDraftModal={showDraftModal}
        loadingDrafts={loadingDrafts}
        availableDrafts={availableDrafts}
        onCloseDraftModal={closeDraftModal}
        onLoadDraft={loadDraft}
        onRequestDeleteDraft={requestDeleteDraft}
        showDeleteConfirm={showDeleteConfirm}
        draftToDelete={draftToDelete}
        onCancelDeleteDraft={cancelDeleteDraft}
        onConfirmDeleteDraft={confirmDeleteDraft}
      />
    </div>
  );
}
