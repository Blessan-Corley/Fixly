'use client';

import { CheckCircle, Edit3 } from 'lucide-react';

import type { LocationMessage, SelectedLocation } from './location.types';

export const actionButtonMotion = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

export function GuidanceMessage({ message }: { message: LocationMessage }): React.JSX.Element {
  return (
    <div className="mx-auto mt-3 max-w-md rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm text-gray-700 dark:text-gray-300">{message.message}</p>
    </div>
  );
}

export function SelectedLocationSummary({
  selectedLocation,
  onReset,
}: {
  selectedLocation: SelectedLocation;
  onReset: () => void;
}): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
            <div className="flex-1">
              <h4 className="font-medium text-green-900 dark:text-green-100">Location Selected</h4>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                {selectedLocation.address}
              </p>
              {selectedLocation.components ? (
                <div className="mt-2 space-y-1">
                  {selectedLocation.components.city ? (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {selectedLocation.components.city}
                      {selectedLocation.components.state
                        ? `, ${selectedLocation.components.state}`
                        : ''}
                      {selectedLocation.components.country
                        ? ` - ${selectedLocation.components.country}`
                        : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <button
            onClick={onReset}
            className="p-1 text-green-600 hover:text-green-700"
            title="Change location"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

