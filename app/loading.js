// app/loading.js
'use client';

import { Wrench } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-fixly-bg flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <Wrench className="h-16 w-16 text-fixly-accent mx-auto mb-4 animate-spin" />
          <div className="absolute inset-0 h-16 w-16 mx-auto border-4 border-fixly-accent/20 border-t-fixly-accent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-semibold text-fixly-text mb-2">Loading...</h2>
        <p className="text-fixly-text-muted">Please wait while we prepare your content</p>
      </div>
    </div>
  );
}