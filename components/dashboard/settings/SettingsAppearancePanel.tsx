'use client';

import { Check, HelpCircle, Monitor, Moon, Sun } from 'lucide-react';

export type AppearancePanelProps = {
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
  setLightTheme: () => void;
  setDarkTheme: () => void;
  setSystemTheme: () => void;
  compactMode: boolean;
  handleCompactModeChange: (enabled: boolean) => void;
  animationsEnabled: boolean;
  handleAnimationsChange: (enabled: boolean) => void;
  autoRefresh: boolean;
  handleAutoRefreshChange: (enabled: boolean) => void;
};

export function SettingsAppearancePanel({
  isDark,
  isLight,
  isSystem,
  setLightTheme,
  setDarkTheme,
  setSystemTheme,
  compactMode,
  handleCompactModeChange,
  animationsEnabled,
  handleAnimationsChange,
  autoRefresh,
  handleAutoRefreshChange,
}: AppearancePanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Theme Settings</h3>
        <div className="card">
          <p className="mb-6 text-sm text-fixly-text-muted">
            Choose your preferred appearance. System will automatically match your device settings.
          </p>

          <div className="space-y-4">
            <div
              className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                isLight && !isSystem
                  ? 'border-fixly-primary bg-fixly-primary-bg'
                  : 'border-fixly-border hover:border-fixly-primary/50'
              }`}
              onClick={setLightTheme}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-2 dark:bg-gray-100">
                    <Sun className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-fixly-text">Light Mode</h4>
                    <p className="text-sm text-fixly-text-muted">Clean and bright interface</p>
                  </div>
                </div>
                {isLight && !isSystem && <Check className="h-5 w-5 text-fixly-primary" />}
              </div>
              <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-2 w-20 rounded bg-gray-200"></div>
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                    <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full rounded bg-gray-100"></div>
                  <div className="h-2 w-3/4 rounded bg-gray-100"></div>
                </div>
              </div>
            </div>

            <div
              className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                isDark && !isSystem
                  ? 'border-fixly-primary bg-fixly-primary-bg'
                  : 'border-fixly-border hover:border-fixly-primary/50'
              }`}
              onClick={setDarkTheme}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg border border-gray-700 bg-gray-800 p-2">
                    <Moon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-fixly-text">Dark Mode</h4>
                    <p className="text-sm text-fixly-text-muted">
                      Elegant dark interface, easy on the eyes
                    </p>
                  </div>
                </div>
                {isDark && !isSystem && <Check className="h-5 w-5 text-fixly-primary" />}
              </div>
              <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-2 w-20 rounded bg-gray-600"></div>
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 rounded-full bg-teal-400"></div>
                    <div className="h-2 w-2 rounded-full bg-gray-600"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full rounded bg-gray-700"></div>
                  <div className="h-2 w-3/4 rounded bg-gray-700"></div>
                </div>
              </div>
            </div>

            <div
              className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                isSystem
                  ? 'border-fixly-primary bg-fixly-primary-bg'
                  : 'border-fixly-border hover:border-fixly-primary/50'
              }`}
              onClick={setSystemTheme}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg border border-gray-300 bg-gradient-to-br from-white to-gray-800 p-2">
                    <Monitor className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-fixly-text">System (Recommended)</h4>
                    <p className="text-sm text-fixly-text-muted">
                      Automatically matches your device theme
                    </p>
                  </div>
                </div>
                {isSystem && <Check className="h-5 w-5 text-fixly-primary" />}
              </div>
              <div className="mt-4 flex space-x-2">
                <div className="flex-1 rounded-lg border border-gray-200 bg-white p-2">
                  <div className="mb-1 h-2 w-full rounded bg-gray-200"></div>
                  <div className="h-2 w-3/4 rounded bg-gray-100"></div>
                </div>
                <div className="flex-1 rounded-lg border border-gray-700 bg-gray-800 p-2">
                  <div className="mb-1 h-2 w-full rounded bg-gray-600"></div>
                  <div className="h-2 w-3/4 rounded bg-gray-700"></div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-fixly-text-muted">
                <div className="flex items-center space-x-1">
                  <Sun className="h-3 w-3" />
                  <span>Light</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Moon className="h-3 w-3" />
                  <span>Dark</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-fixly-bg-muted p-4">
            <div className="flex items-start space-x-3">
              <HelpCircle className="mt-0.5 h-5 w-5 text-fixly-accent" />
              <div>
                <h5 className="mb-1 font-medium text-fixly-text">About Theme Settings</h5>
                <p className="text-sm text-fixly-text-muted">
                  Your theme preference is saved and will be applied across all your sessions.
                  System theme automatically switches between light and dark based on your device
                  settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Display Options</h3>
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-fixly-text">Compact Mode</h4>
              <p className="text-sm text-fixly-text-muted">Reduce spacing for more content</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => handleCompactModeChange(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-fixly-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/20"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-fixly-text">Animations</h4>
              <p className="text-sm text-fixly-text-muted">Enable smooth transitions and effects</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => handleAnimationsChange(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-fixly-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/20"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-fixly-text">Auto-refresh</h4>
              <p className="text-sm text-fixly-text-muted">
                Automatically refresh content for updates
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => handleAutoRefreshChange(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-fixly-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/20"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
