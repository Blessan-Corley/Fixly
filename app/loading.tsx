'use client';

import { Wrench } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fixly-bg">
      <div className="text-center">
        <div className="relative">
          <Wrench className="mx-auto mb-4 h-16 w-16 animate-spin text-fixly-accent" />
          <div className="absolute inset-0 mx-auto h-16 w-16 animate-spin rounded-full border-4 border-fixly-accent/20 border-t-fixly-accent" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-fixly-text">Loading...</h2>
        <p className="text-fixly-text-muted">Please wait while we prepare your content</p>
      </div>
    </div>
  );
}
