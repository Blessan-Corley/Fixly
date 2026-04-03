import { create } from 'zustand';

export type UIStoreState = {
  isMobileNavOpen: boolean;
  isSearchOpen: boolean;
  activeModal: string | null;
  toggleMobileNav: () => void;
  openModal: (modalName: string) => void;
  closeModal: () => void;
  setSearchOpen: (open: boolean) => void;
};

export const useUIStore = create<UIStoreState>((set) => ({
  isMobileNavOpen: false,
  isSearchOpen: false,
  activeModal: null,
  toggleMobileNav: (): void => {
    set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen }));
  },
  openModal: (modalName: string): void => {
    set({ activeModal: modalName });
  },
  closeModal: (): void => {
    set({ activeModal: null });
  },
  setSearchOpen: (open: boolean): void => {
    set({ isSearchOpen: open });
  },
}));
