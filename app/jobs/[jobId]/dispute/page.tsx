'use client';

import { AlertCircle, AlertTriangle, ArrowLeft, Loader, Scale, Send, Shield } from 'lucide-react';

import DisputeCategorySection from './DisputeCategorySection';
import DisputeDetailsSection from './DisputeDetailsSection';
import DisputeEvidenceSection from './DisputeEvidenceSection';
import DisputeJobSidebar from './DisputeJobSidebar';
import DisputeResolutionSection from './DisputeResolutionSection';
import { useDisputePage } from './useDisputePage';

export default function CreateDisputePage() {
  const {
    job,
    loading,
    isSubmitting,
    canSubmit,
    disputeData,
    otherParty,
    submitWithValidation,
    submitDispute,
    onInvalidSubmit,
    setDisputeData,
    handleEvidenceUpload,
    removeEvidence,
    updateEvidenceDescription,
    handleBack,
  } = useDisputePage();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-semibold text-fixly-text">Job not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fixly-bg py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="mb-4 flex items-center text-fixly-text-light hover:text-fixly-accent"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Job
          </button>

          <div className="mb-4 flex items-center">
            <div className="mr-4 rounded-lg bg-red-100 p-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h1 className="mb-2 text-3xl font-bold text-fixly-text">Create Dispute</h1>
              <p className="text-fixly-text-light">File a dispute to resolve issues with this job</p>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start">
              <Shield className="mr-3 mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <h3 className="mb-1 text-sm font-medium text-blue-800">Before Filing a Dispute</h3>
                <p className="text-sm text-blue-700">
                  We recommend trying to resolve the issue directly with the other party first.
                  Disputes should be used when direct communication has failed to resolve the matter.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <DisputeJobSidebar job={job} otherParty={otherParty} />
          </div>

          <div className="lg:col-span-2">
            <form
              onSubmit={submitWithValidation(submitDispute, onInvalidSubmit)}
              className="space-y-8"
            >
              <DisputeCategorySection
                category={disputeData.category}
                subcategory={disputeData.subcategory}
                setDisputeData={setDisputeData}
              />

              <DisputeDetailsSection
                title={disputeData.title}
                description={disputeData.description}
                setDisputeData={setDisputeData}
              />

              <DisputeResolutionSection
                desiredOutcome={disputeData.desiredOutcome}
                desiredOutcomeDetails={disputeData.desiredOutcomeDetails}
                disputedAmount={disputeData.disputedAmount}
                refundRequested={disputeData.refundRequested}
                additionalPaymentRequested={disputeData.additionalPaymentRequested}
                setDisputeData={setDisputeData}
              />

              <DisputeEvidenceSection
                evidence={disputeData.evidence}
                onUpload={handleEvidenceUpload}
                onRemove={removeEvidence}
                onUpdateDescription={updateEvidenceDescription}
              />

              <div className="card">
                <div className="mb-6 flex items-start space-x-3">
                  <Scale className="mt-1 h-5 w-5 text-fixly-accent" />
                  <div>
                    <h4 className="mb-2 font-medium text-fixly-text">Legal Notice</h4>
                    <p className="text-sm text-fixly-text-light">
                      By submitting this dispute, you confirm that the information provided is
                      accurate and you understand that false claims may result in account penalties.
                      This dispute will be reviewed by our moderation team and may be subject to
                      mediation or arbitration.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button type="button" onClick={handleBack} className="btn-ghost">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="btn-primary flex items-center disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-5 w-5" />
                    )}
                    {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
