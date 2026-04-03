'use client';

import { Headphones, HelpCircle, Home } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthShellProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  children: ReactNode;
  footer?: ReactNode;
};

function FixlyMark() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-fixly-accent text-xl font-bold text-fixly-text shadow-lg shadow-fixly-accent/20">
      F
    </div>
  );
}

export default function AuthShell({ title, subtitle, badge, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-dvh overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_35%),linear-gradient(180deg,_#fffaf2_0%,_#ffffff_46%,_#f8fafc_100%)] px-4 py-4 dark:bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.1),_transparent_30%),linear-gradient(180deg,_#0b1220_0%,_#111827_42%,_#050816_100%)] sm:py-5">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <div className="flex items-center justify-center pb-3 text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <FixlyMark />
            <div>
              <div className="text-2xl font-bold text-fixly-text dark:text-white">Fixly</div>
            </div>
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 dark:shadow-black/30 sm:p-6">
            <div className="mb-5 text-center">
              {badge ? (
                <div className="mb-2 inline-flex rounded-full border border-fixly-accent/30 bg-fixly-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fixly-accent">
                  {badge}
                </div>
              ) : null}
              <h1 className="text-[28px] font-bold leading-tight text-fixly-text dark:text-white">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-fixly-text-light dark:text-gray-300">{subtitle}</p>
              ) : null}
            </div>

            {children}
          </div>
        </div>

        <div className="pt-3 text-center text-sm text-fixly-text-light dark:text-gray-300">
          {footer ? <div className="mb-3">{footer}</div> : null}
          <div className="flex items-center justify-center gap-3 text-xs sm:text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-1 transition-colors hover:text-fixly-accent"
            >
              <Home className="h-4 w-4" />
              Back Home
            </Link>
            <span className="text-fixly-border">|</span>
            <Link
              href="/help"
              className="inline-flex items-center gap-1 transition-colors hover:text-fixly-accent"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Link>
            <span className="text-fixly-border">|</span>
            <Link
              href="/support"
              className="inline-flex items-center gap-1 transition-colors hover:text-fixly-accent"
            >
              <Headphones className="h-4 w-4" />
              Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
