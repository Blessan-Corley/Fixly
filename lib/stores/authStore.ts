// Phase 2: Added in-memory CSRF token state for authenticated client mutations.
import { create } from 'zustand';

type AuthStoreState = {
  csrfToken: string | null;
  setCsrfToken: (token: string) => void;
  clearCsrfToken: () => void;
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  csrfToken: null,
  setCsrfToken: (token: string): void => {
    set({ csrfToken: token });
  },
  clearCsrfToken: (): void => {
    set({ csrfToken: null });
  },
}));

export function useCsrfToken(): string | null {
  return useAuthStore((state) => state.csrfToken);
}
