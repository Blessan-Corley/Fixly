'use client';

import { ChevronDown, ChevronUp, Loader } from 'lucide-react';

type EnvHealthVariable = {
  name: string;
  scope: 'server' | 'client';
  status: 'present' | 'missing';
};

type AdminEnvironmentHealthPanelProps = {
  show: boolean;
  healthScore: number;
  variables: EnvHealthVariable[];
  isLoading: boolean;
  onToggle: () => void;
};

export default function AdminEnvironmentHealthPanel({
  show,
  healthScore,
  variables,
  isLoading,
  onToggle,
}: AdminEnvironmentHealthPanelProps): React.JSX.Element {
  return (
    <div className="rounded-xl border border-fixly-border bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-4 text-left"
      >
        <div>
          <h3 className="font-semibold text-fixly-text">Environment Health</h3>
          <p className="text-sm text-fixly-text-muted">
            Health score: {healthScore}% across configured runtime variables
          </p>
        </div>
        {show ? (
          <ChevronUp className="h-5 w-5 text-fixly-text-muted" />
        ) : (
          <ChevronDown className="h-5 w-5 text-fixly-text-muted" />
        )}
      </button>

      {show && (
        <div className="border-t border-fixly-border px-4 py-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-fixly-text-muted">
              <Loader className="h-4 w-4 animate-spin" />
              Refreshing environment health...
            </div>
          ) : (
            <div className="space-y-2">
              {variables.map((variable) => (
                <div
                  key={variable.name}
                  className="flex items-center justify-between rounded-lg bg-fixly-bg px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-fixly-text">{variable.name}</div>
                    <div className="text-xs uppercase tracking-wide text-fixly-text-muted">
                      {variable.scope}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      variable.status === 'present'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {variable.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
