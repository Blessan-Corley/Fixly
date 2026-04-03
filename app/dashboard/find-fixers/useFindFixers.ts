'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  DEFAULT_FILTERS,
  DEFAULT_PAGINATION,
  type FixerProfile,
  type SearchFilters,
  type SearchPagination,
} from './find-fixers.types';
import { isAbortError, normalizeSearchResponse } from './find-fixers.utils';

export type UseFindFixersReturn = {
  fixers: FixerProfile[];
  loading: boolean;
  searching: boolean;
  pagination: SearchPagination;
  filters: SearchFilters;
  showFilters: boolean;
  selectedFixer: FixerProfile | null;
  showProfileModal: boolean;
  showMessageModal: boolean;
  handleSearch: () => void;
  handleFilterChange: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  handleSkillToggle: (skill: string) => void;
  handleContactFixer: (fixer: FixerProfile) => void;
  handleViewProfile: (fixer: FixerProfile) => void;
  handleLoadMore: () => void;
  handleClearFilters: () => void;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  setShowProfileModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMessageModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedFixer: React.Dispatch<React.SetStateAction<FixerProfile | null>>;
};

export function useFindFixers(): UseFindFixersReturn {
  const [fixers, setFixers] = useState<FixerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [pagination, setPagination] = useState<SearchPagination>(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFixer, setSelectedFixer] = useState<FixerProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    void fetchFixers(true, 1);
  }, [filters.sortBy, filters.minRating, filters.availability]);

  const fetchFixers = async (reset = false, pageOverride?: number): Promise<void> => {
    try {
      const pageToFetch = pageOverride ?? (reset ? 1 : pagination.page);

      if (reset) {
        setLoading(true);
        setPagination((prev) => ({ ...prev, page: 1 }));
      } else {
        setSearching(true);
      }

      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
      }
      const abortController = new AbortController();
      fetchAbortRef.current = abortController;

      const params = new URLSearchParams({
        page: String(pageToFetch),
        limit: '12',
        role: 'fixer',
        isPro: 'true',
        ...Object.fromEntries(
          Object.entries(filters).filter(
            ([key, value]) =>
              key !== 'isPro' && value !== '' && (Array.isArray(value) ? value.length > 0 : true)
          )
        ),
      });

      if (filters.skills.length > 0) {
        params.set('skills', filters.skills.join(','));
      }

      const response = await fetch(`/api/user/profile/search?${params}`, {
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;

      const text = await response.text();
      let data: unknown = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid response from server');
      }

      if (response.ok) {
        const normalized = normalizeSearchResponse(data, pageToFetch);
        if (reset) {
          setFixers(normalized.users);
        } else {
          setFixers((prev) => [...prev, ...normalized.users]);
        }
        setPagination(normalized.pagination);
      } else {
        const normalized = normalizeSearchResponse(data, pageToFetch);
        toast.error(normalized.message || 'Failed to fetch fixers');
      }
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Error fetching fixers:', error);
      toast.error('Failed to fetch fixers');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleSearch = (): void => { void fetchFixers(true, 1); };

  const handleFilterChange = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]): void => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSkillToggle = (skill: string): void => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleContactFixer = (fixer: FixerProfile): void => {
    setSelectedFixer(fixer);
    setShowMessageModal(true);
  };

  const handleViewProfile = (fixer: FixerProfile): void => {
    setSelectedFixer(fixer);
    setShowProfileModal(true);
  };

  const handleLoadMore = (): void => {
    const nextPage = pagination.page + 1;
    setPagination((prev) => ({ ...prev, page: nextPage }));
    void fetchFixers(false, nextPage);
  };

  const handleClearFilters = (): void => {
    setFilters(DEFAULT_FILTERS);
    void fetchFixers(true, 1);
  };

  return {
    fixers,
    loading,
    searching,
    pagination,
    filters,
    showFilters,
    selectedFixer,
    showProfileModal,
    showMessageModal,
    handleSearch,
    handleFilterChange,
    handleSkillToggle,
    handleContactFixer,
    handleViewProfile,
    handleLoadMore,
    handleClearFilters,
    setShowFilters,
    setShowProfileModal,
    setShowMessageModal,
    setSelectedFixer,
  };
}
