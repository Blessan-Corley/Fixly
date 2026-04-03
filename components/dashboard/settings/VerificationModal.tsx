'use client';

import { motion } from 'framer-motion';
import { Check, Loader, Plus, Shield, X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import { VERIFICATION_DOCUMENT_OPTIONS } from '../../../lib/settings/constants';
import type { VerificationFormData } from '../../../types/settings';

export type VerificationModalProps = {
  verificationData: VerificationFormData;
  setVerificationData: Dispatch<SetStateAction<VerificationFormData>>;
  uploadingVerification: boolean;
  onClose: () => void;
  onHandleDocumentUpload: (files: FileList | null) => void;
  onRemoveDocument: (index: number) => void;
  onSubmit: () => void | Promise<void>;
};

export function VerificationModal({
  verificationData,
  setVerificationData,
  uploadingVerification,
  onClose,
  onHandleDocumentUpload,
  onRemoveDocument,
  onSubmit,
}: VerificationModalProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-fixly-card p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-fixly-text">Apply for Verification</h2>
            <p className="text-sm text-fixly-text-muted">
              Upload your government ID for account verification
            </p>
          </div>
          <button onClick={onClose} className="text-fixly-text-muted hover:text-fixly-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-3 block text-sm font-medium text-fixly-text">
              Document Type *
            </label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {VERIFICATION_DOCUMENT_OPTIONS.map((doc) => (
                <label
                  key={doc.value}
                  className={`flex cursor-pointer items-center rounded-lg border-2 p-3 transition-all ${
                    verificationData.documentType === doc.value
                      ? 'border-fixly-accent bg-fixly-accent/5'
                      : 'border-fixly-border hover:border-fixly-accent/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="documentType"
                    value={doc.value}
                    checked={verificationData.documentType === doc.value}
                    onChange={(e) =>
                      setVerificationData((prev) => ({ ...prev, documentType: e.target.value }))
                    }
                    className="sr-only"
                  />
                  <span className="mr-3 text-2xl">{doc.icon}</span>
                  <span className="font-medium text-fixly-text">{doc.label}</span>
                  {verificationData.documentType === doc.value && (
                    <Check className="ml-auto h-4 w-4 text-fixly-accent" />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-fixly-text">
              Upload Documents * (Max 3 files, 5MB each)
            </label>
            <div className="rounded-lg border-2 border-dashed border-fixly-border p-6 text-center">
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => onHandleDocumentUpload(e.target.files)}
                className="hidden"
                id="verification-upload"
              />
              <label htmlFor="verification-upload" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <Plus className="mb-2 h-8 w-8 text-fixly-accent" />
                  <p className="font-medium text-fixly-text">Click to upload documents</p>
                  <p className="text-sm text-fixly-text-muted">JPG, PNG, or PDF files</p>
                </div>
              </label>
            </div>

            {verificationData.documentFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {verificationData.documentFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-fixly-bg-secondary p-3"
                  >
                    <div className="flex items-center">
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded bg-fixly-accent/10">
                        <span className="text-xs text-fixly-accent">
                          {file.type.includes('pdf') ? 'PDF' : 'IMG'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-fixly-text">{file.name}</p>
                        <p className="text-xs text-fixly-text-muted">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveDocument(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">
              Additional Information (Optional)
            </label>
            <textarea
              value={verificationData.additionalInfo}
              onChange={(e) =>
                setVerificationData((prev) => ({ ...prev, additionalInfo: e.target.value }))
              }
              placeholder="Any additional information that might help with verification..."
              className="textarea-field h-20"
              maxLength={500}
            />
            <p className="mt-1 text-xs text-fixly-text-muted">
              {verificationData.additionalInfo.length}/500 characters
            </p>
          </div>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h4 className="mb-2 font-medium text-yellow-800">Important Notes:</h4>
            <ul className="space-y-1 text-sm text-yellow-700">
              <li>&bull; All documents must be clear and readable</li>
              <li>&bull; Personal information will be kept confidential</li>
              <li>&bull; Review typically takes 3-5 business days</li>
              <li>&bull; You can only apply once every 7 days</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={
                uploadingVerification ||
                !verificationData.documentType ||
                verificationData.documentFiles.length === 0
              }
              className="btn-primary flex-1"
            >
              {uploadingVerification ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              {uploadingVerification ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
