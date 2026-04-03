'use client';

import { useProfileEmailFlow } from './useProfileEmailFlow';
import { useProfilePasswordFlow } from './useProfilePasswordFlow';
import { useProfilePhoneFlow } from './useProfilePhoneFlow';
import type { UseProfileEmailFlowResult } from './useProfileEmailFlow';
import type { UseProfilePasswordFlowResult } from './useProfilePasswordFlow';
import type { UseProfilePhoneFlowResult } from './useProfilePhoneFlow';
import type { ProfileUser } from '../types/profile';

export type { UseProfilePasswordFlowResult, UseProfilePhoneFlowResult, UseProfileEmailFlowResult };

export type UseProfileSecurityFlowsOptions = {
  user: ProfileUser | null;
  updateUser: (user: Partial<ProfileUser>) => void;
};

export type UseProfileSecurityFlowsResult = UseProfilePasswordFlowResult &
  UseProfilePhoneFlowResult &
  UseProfileEmailFlowResult;

export function useProfileSecurityFlows({
  user,
  updateUser,
}: UseProfileSecurityFlowsOptions): UseProfileSecurityFlowsResult {
  const password = useProfilePasswordFlow(user?.email);
  const phone = useProfilePhoneFlow(user, updateUser);
  const email = useProfileEmailFlow(user, updateUser);

  return {
    ...password,
    ...phone,
    ...email,
  };
}
