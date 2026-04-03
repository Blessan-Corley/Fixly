'use client';

import { User } from 'lucide-react';

import { RoleGuard } from '../../providers';

import { FindFixersContent } from './FindFixersContent';

export default function FindFixersPage(): React.JSX.Element {
  return (
    <RoleGuard
      roles={['hirer']}
      fallback={
        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="card">
              <User className="mx-auto mb-4 h-16 w-16 text-fixly-accent" />
              <h2 className="mb-2 text-xl font-bold text-fixly-text">Hirer Access Required</h2>
              <p className="mb-4 text-fixly-text-muted">
                Only hirers can access the find fixers feature.
              </p>
              <button
                onClick={() => (window.location.href = '/dashboard')}
                className="btn-primary w-full"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      }
    >
      <FindFixersContent />
    </RoleGuard>
  );
}
