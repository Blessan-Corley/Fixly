import { beforeEach, describe, expect, it } from 'vitest';

import { useUIStore } from '@/lib/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      isMobileNavOpen: false,
      isSearchOpen: false,
      activeModal: null,
    });
  });

  it('toggles mobile nav', () => {
    useUIStore.getState().toggleMobileNav();
    expect(useUIStore.getState().isMobileNavOpen).toBe(true);

    useUIStore.getState().toggleMobileNav();
    expect(useUIStore.getState().isMobileNavOpen).toBe(false);
  });

  it('opens and closes modal', () => {
    useUIStore.getState().openModal('confirmDelete');
    expect(useUIStore.getState().activeModal).toBe('confirmDelete');

    useUIStore.getState().closeModal();
    expect(useUIStore.getState().activeModal).toBeNull();
  });

  it('sets search open state', () => {
    useUIStore.getState().setSearchOpen(true);
    expect(useUIStore.getState().isSearchOpen).toBe(true);
  });
});
