'use client';

import { File, Image, Upload, X } from 'lucide-react';
import type { ChangeEvent } from 'react';

import type { EvidenceItem } from './dispute.types';

type DisputeEvidenceSectionProps = {
  evidence: EvidenceItem[];
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (evidenceId: string) => void;
  onUpdateDescription: (evidenceId: string, description: string) => void;
};

export default function DisputeEvidenceSection({
  evidence,
  onUpload,
  onRemove,
  onUpdateDescription,
}: DisputeEvidenceSectionProps) {
  return (
    <div className="card">
      <h3 className="mb-6 text-lg font-semibold text-fixly-text">Supporting Evidence</h3>

      <div className="space-y-6">
        <div>
          <label className="mb-3 block text-sm font-medium text-fixly-text">
            Upload Evidence (Optional)
          </label>
          <p className="mb-4 text-sm text-fixly-text-light">
            Upload screenshots, photos, documents, or other files that support your dispute.
            Maximum file size: 10MB per file.
          </p>

          <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-fixly-border transition-colors hover:border-fixly-accent">
            <div className="flex flex-col items-center justify-center pb-6 pt-5">
              <Upload className="mb-2 h-8 w-8 text-fixly-text-light" />
              <p className="text-sm text-fixly-text-light">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-fixly-text-muted">
                Images, PDFs, documents (max 10MB each)
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={onUpload}
              className="hidden"
            />
          </label>
        </div>

        {evidence.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-fixly-text">Uploaded Evidence</h4>
            {evidence.map((item) => (
              <div
                key={item.id}
                className="flex items-start space-x-3 rounded-lg border border-fixly-border p-3"
              >
                <div className="flex-shrink-0">
                  {item.type === 'image' ? (
                    <Image className="h-5 w-5 text-blue-500" />
                  ) : (
                    <File className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fixly-text">{item.filename}</p>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(event) => onUpdateDescription(item.id, event.target.value)}
                    placeholder="Add a description for this evidence..."
                    className="mt-2 w-full rounded border border-fixly-border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-fixly-accent"
                    maxLength={500}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="flex-shrink-0 text-red-500 hover:text-red-600"
                  aria-label="Remove evidence"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
