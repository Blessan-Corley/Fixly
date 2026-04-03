'use client';

import { Download, FileText, Image as ImageIcon } from 'lucide-react';

import type { DisputeEvidence } from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.types';

export function DisputeEvidenceCard({
  evidence,
}: {
  evidence: DisputeEvidence[];
}): React.JSX.Element | null {
  if (evidence.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h2 className="mb-4 text-xl font-semibold text-fixly-text">Evidence</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {evidence.map((item, index) => (
          <div
            key={`${item.url}-${index}`}
            className="rounded-lg border border-fixly-border p-4"
          >
            <div className="mb-2 flex items-center space-x-3">
              {item.type === 'image' ? (
                <ImageIcon className="h-5 w-5 text-blue-500" />
              ) : (
                <FileText className="h-5 w-5 text-gray-500" />
              )}
              <span className="truncate font-medium text-fixly-text">{item.filename}</span>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fixly-accent hover:text-fixly-accent-dark"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
            {item.description && <p className="text-sm text-fixly-text-light">{item.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
