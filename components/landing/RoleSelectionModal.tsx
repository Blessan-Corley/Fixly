'use client';

import { Search, Wrench, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

type RoleSelectionModalProps = {
  onSelect: (role: 'hirer' | 'fixer') => void;
  onClose: () => void;
};

export default function RoleSelectionModal({ onSelect, onClose }: RoleSelectionModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC key closes the modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus trap — keep focus inside the modal panel
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const focusableSelectors =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelectors));

    if (focusable.length > 0) {
      focusable[0].focus();
    }

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <button
        type="button"
        aria-label="Close role selection"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />
      <div ref={panelRef} className="relative w-full max-w-md rounded-2xl bg-fixly-card p-8 shadow-fixly-lg">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-fixly-text-muted transition-colors duration-200 hover:bg-fixly-bg hover:text-fixly-text"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="role-modal-title" className="mb-6 text-center text-2xl font-bold text-fixly-text">
          Choose Your Role
        </h2>

        <div className="space-y-4">
          <button
            onClick={() => onSelect('hirer')}
            className="w-full rounded-xl border-2 border-fixly-border p-6 text-left transition-colors duration-200 hover:border-fixly-accent"
          >
            <div className="mb-2 flex items-center">
              <Search className="mr-3 h-6 w-6 text-fixly-accent" />
              <span className="text-xl font-semibold text-fixly-text">I&apos;m a Hirer</span>
            </div>
            <p className="text-fixly-text-light">
              I need to hire service professionals for my jobs
            </p>
          </button>

          <button
            onClick={() => onSelect('fixer')}
            className="w-full rounded-xl border-2 border-fixly-border p-6 text-left transition-colors duration-200 hover:border-fixly-accent"
          >
            <div className="mb-2 flex items-center">
              <Wrench className="mr-3 h-6 w-6 text-fixly-accent" />
              <span className="text-xl font-semibold text-fixly-text">I&apos;m a Fixer</span>
            </div>
            <p className="text-fixly-text-light">
              I provide services and want to find work opportunities
            </p>
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="text-fixly-text-muted transition-colors duration-200 hover:text-fixly-text"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
