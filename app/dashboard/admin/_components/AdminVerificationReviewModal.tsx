'use client';

import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, ExternalLink, X } from 'lucide-react';
import Image from 'next/image';

type VerificationDocument = {
  originalName: string;
  fileSize: number;
  fileType: string;
  cloudinaryUrl: string;
};

type VerificationApplication = {
  id: string;
  applicationId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  documentType: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  additionalInfo: string;
  documents: VerificationDocument[];
};

type AdminVerificationReviewModalProps = {
  application: VerificationApplication;
  onClose: () => void;
  onApprove: () => void | Promise<void>;
  onReject: (reason: string) => void | Promise<void>;
};

function formatDate(value: string, includeTime = false): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return includeTime ? parsed.toLocaleString() : parsed.toLocaleDateString();
}

export default function AdminVerificationReviewModal({
  application,
  onClose,
  onApprove,
  onReject,
}: AdminVerificationReviewModalProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-fixly-card p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-fixly-text">Verification Review</h2>
            <p className="text-sm text-fixly-text-muted">
              Application ID: {application.applicationId}
            </p>
          </div>
          <button onClick={onClose} className="text-fixly-text-muted hover:text-fixly-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h3 className="mb-3 font-semibold text-fixly-text">Applicant Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-fixly-text-muted">Name:</span>
                  <span className="text-fixly-text">{application.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fixly-text-muted">Email:</span>
                  <span className="text-fixly-text">{application.userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fixly-text-muted">Phone:</span>
                  <span className="text-fixly-text">{application.userPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fixly-text-muted">Document Type:</span>
                  <span className="text-fixly-text">
                    {application.documentType.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fixly-text-muted">Submitted:</span>
                  <span className="text-fixly-text">
                    {formatDate(application.submittedAt, true)}
                  </span>
                </div>
              </div>
            </div>

            {application.additionalInfo && (
              <div>
                <h3 className="mb-2 font-semibold text-fixly-text">Additional Information</h3>
                <p className="text-sm text-fixly-text-muted">{application.additionalInfo}</p>
              </div>
            )}

            {application.status === 'pending' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-fixly-text">Actions</h3>
                <div className="flex gap-3">
                  <button onClick={onApprove} className="btn-primary flex-1">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Please provide a reason for rejection:');
                      if (reason) {
                        void onReject(reason);
                      }
                    }}
                    className="flex flex-1 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-fixly-text">Uploaded Documents</h3>
            <div className="space-y-3">
              {application.documents.map((doc, index) => (
                <div
                  key={`${doc.cloudinaryUrl}-${index}`}
                  className="rounded-lg border border-fixly-border p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-fixly-text">{doc.originalName}</span>
                    <span className="text-xs text-fixly-text-muted">
                      {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="mb-2">
                    {doc.fileType.includes('image') ? (
                      <Image
                        src={doc.cloudinaryUrl}
                        alt={doc.originalName}
                        width={1200}
                        height={768}
                        className="h-48 w-full rounded border border-fixly-border object-contain"
                      />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center rounded border border-fixly-border bg-gray-100">
                        <div className="text-center">
                          <div className="mb-2 text-2xl font-semibold text-fixly-text-muted">
                            PDF
                          </div>
                          <p className="text-sm text-fixly-text-muted">PDF Document</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <a
                    href={doc.cloudinaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-fixly-accent hover:text-fixly-accent-dark"
                  >
                    <ExternalLink className="mr-1 h-4 w-4" />
                    View Full Size
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
