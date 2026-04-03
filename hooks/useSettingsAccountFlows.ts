'use client';

import { useSettingsCredentialFlows } from './useSettingsCredentialFlows';
import { useSettingsVerificationFlow } from './useSettingsVerificationFlow';
import type { UseSettingsCredentialFlowsResult } from './useSettingsCredentialFlows';
import type { UseSettingsVerificationFlowResult } from './useSettingsVerificationFlow';
import type { SettingsUser } from '../types/settings';

export type { UseSettingsCredentialFlowsResult, UseSettingsVerificationFlowResult };

export type UseSettingsAccountFlowsOptions = {
  user: SettingsUser | null;
};

export type UseSettingsAccountFlowsResult = UseSettingsCredentialFlowsResult &
  UseSettingsVerificationFlowResult;

export function useSettingsAccountFlows({
  user,
}: UseSettingsAccountFlowsOptions): UseSettingsAccountFlowsResult {
  const credentials = useSettingsCredentialFlows(user);
  const verification = useSettingsVerificationFlow(user);

  return {
    ...credentials,
    ...verification,
  };
}
