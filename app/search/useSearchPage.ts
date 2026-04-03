'use client';

import { useRouter } from 'next/navigation';
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from 'nuqs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

import { useSearch } from '@/lib/queries/search';
import { useUIStore } from '@/lib/stores/uiStore';

import { getAllSkills, searchCities } from '../../data/cities';

import { DEFAULT_FILTERS } from './_lib/search.constants';
import {
  asNumber,
  normalizeCitySuggestions,
  normalizeJobs,
  normalizeSkills,
} from './_lib/search.normalizers';
import type { JobSearchResult, JobsBrowsePayload, SearchFilters, ViewMode } from './_lib/search.types';

export type UseSearchPageReturn = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  selectedSkills: string[];
  hasSearched: boolean;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  filters: SearchFilters;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  locationQuery: string;
  locationSuggestions: string[];
  showLocationSuggestions: boolean;
  skillQuery: string;
  skillSuggestions: string[];
  showSkillSuggestions: boolean;
  loading: boolean;
  jobs: JobSearchResult[];
  totalResults: number;
  error: string | null;
  performSearch: (filtersOverride?: SearchFilters) => Promise<void>;
  handleLocationSearch: (query: string) => void;
  handleSkillSearch: (query: string) => void;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  clearFilters: () => void;
  handleFilterFieldChange: (field: keyof SearchFilters, value: string) => void;
  handleSortByChange: (sortBy: string) => void;
  openJob: (jobId: string) => void;
};

export function useSearchPage(): UseSearchPageReturn {
  const router = useRouter();
  const [urlParams, setUrlParams] = useQueryStates({
    q: parseAsString.withDefault(''),
    location: parseAsString.withDefault(''),
    skills: parseAsArrayOf(parseAsString).withDefault([]),
    budgetMin: parseAsInteger,
    budgetMax: parseAsInteger,
    budgetType: parseAsStringEnum(['fixed', 'range', 'negotiable']),
    urgency: parseAsStringEnum(['urgent', 'medium', 'low']),
    datePosted: parseAsStringEnum(['today', 'week', 'month']),
    sortBy: parseAsStringEnum(['relevance', 'newest', 'oldest', 'budget_high', 'budget_low', 'applications']),
  });

  const hasUrlSearchFilters = Boolean(
    urlParams.q ||
      urlParams.location ||
      (urlParams.skills?.length ?? 0) > 0 ||
      urlParams.budgetMin != null ||
      urlParams.budgetMax != null ||
      urlParams.budgetType ||
      urlParams.urgency ||
      urlParams.datePosted ||
      urlParams.sortBy
  );

  const [searchQuery, setSearchQuery] = useState(urlParams.q ?? '');
  const [selectedLocation, setSelectedLocation] = useState(urlParams.location ?? '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(urlParams.skills ?? []);
  const [hasSearched, setHasSearched] = useState(false);
  const isSearchOpen = useUIStore((state) => state.isSearchOpen);
  const setSearchOpen = useUIStore((state) => state.setSearchOpen);
  const [filters, setFilters] = useState<SearchFilters>({
    budgetMin: urlParams.budgetMin ? String(urlParams.budgetMin) : '',
    budgetMax: urlParams.budgetMax ? String(urlParams.budgetMax) : '',
    budgetType: urlParams.budgetType ?? '',
    urgency: urlParams.urgency ?? '',
    datePosted: urlParams.datePosted ?? '',
    sortBy: urlParams.sortBy ?? DEFAULT_FILTERS.sortBy,
  });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [skillQuery, setSkillQuery] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [debouncedSearchQuery] = useDebounce(searchQuery, 400);

  const searchParamsPayload = {
    location: selectedLocation || undefined,
    skills: selectedSkills.length > 0 ? selectedSkills.join(',') : undefined,
    budgetMin: filters.budgetMin || undefined,
    budgetMax: filters.budgetMax || undefined,
    budgetType: filters.budgetType || undefined,
    urgency: filters.urgency || undefined,
    datePosted: filters.datePosted || undefined,
    sortBy: filters.sortBy || undefined,
  };

  const { data: searchResponse, isLoading: loading, error: searchError } = useSearch(
    debouncedSearchQuery,
    searchParamsPayload,
    { enabled: hasSearched || hasUrlSearchFilters }
  );

  const performSearch = useCallback(
    async (filtersOverride?: SearchFilters): Promise<void> => {
      const activeFilters = filtersOverride ?? filters;
      setHasSearched(true);
      try {
        await setUrlParams({
          q: searchQuery || null,
          location: selectedLocation || null,
          skills: selectedSkills.length > 0 ? selectedSkills : null,
          budgetMin: activeFilters.budgetMin ? Number(activeFilters.budgetMin) : null,
          budgetMax: activeFilters.budgetMax ? Number(activeFilters.budgetMax) : null,
          budgetType: activeFilters.budgetType || null,
          urgency: activeFilters.urgency || null,
          datePosted: activeFilters.datePosted || null,
          sortBy: activeFilters.sortBy || null,
        });
      } catch (err: unknown) {
        console.error('Search error:', err);
        toast.error('Search failed. Please try again.');
      }
    },
    [filters, searchQuery, selectedLocation, selectedSkills, setUrlParams]
  );

  useEffect(() => {
    if (hasUrlSearchFilters) setHasSearched(true);
  }, [hasUrlSearchFilters]);

  useEffect(() => {
    setSearchQuery(urlParams.q ?? '');
    setSelectedLocation(urlParams.location ?? '');
    setSelectedSkills(urlParams.skills ?? []);
    setFilters({
      budgetMin: urlParams.budgetMin ? String(urlParams.budgetMin) : '',
      budgetMax: urlParams.budgetMax ? String(urlParams.budgetMax) : '',
      budgetType: urlParams.budgetType ?? '',
      urgency: urlParams.urgency ?? '',
      datePosted: urlParams.datePosted ?? '',
      sortBy: urlParams.sortBy ?? DEFAULT_FILTERS.sortBy,
    });
  }, [
    urlParams.budgetMax, urlParams.budgetMin, urlParams.budgetType, urlParams.datePosted,
    urlParams.location, urlParams.q, urlParams.skills, urlParams.sortBy, urlParams.urgency,
  ]);

  const jobs = useMemo<JobSearchResult[]>(() => {
    const payload = (searchResponse ?? {}) as JobsBrowsePayload;
    return normalizeJobs(payload?.jobs);
  }, [searchResponse]);

  const totalResults = useMemo<number>(() => {
    const payload = (searchResponse ?? {}) as JobsBrowsePayload;
    const totalFromPagination =
      typeof payload?.pagination?.total === 'number' ? payload.pagination.total : undefined;
    return totalFromPagination ?? asNumber(payload?.total) ?? jobs.length;
  }, [jobs.length, searchResponse]);

  const error =
    searchError instanceof Error ? searchError.message : searchError ? 'Search failed' : null;

  const handleLocationSearch = (query: string): void => {
    setLocationQuery(query);
    if (query.length > 0) {
      setLocationSuggestions(normalizeCitySuggestions(searchCities(query) as unknown));
      setShowLocationSuggestions(true);
      return;
    }
    setShowLocationSuggestions(false);
  };

  const handleSkillSearch = (query: string): void => {
    setSkillQuery(query);
    if (query.length > 0) {
      const skills = normalizeSkills(getAllSkills() as unknown).filter((skill) =>
        skill.toLowerCase().includes(query.toLowerCase())
      );
      setSkillSuggestions(skills.slice(0, 10));
      setShowSkillSuggestions(true);
      return;
    }
    setShowSkillSuggestions(false);
  };

  const addSkill = (skill: string): void => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev : [...prev, skill]));
    setSkillQuery('');
    setShowSkillSuggestions(false);
  };

  const removeSkill = (skill: string): void => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
  };

  const clearFilters = (): void => {
    setSearchQuery('');
    setSelectedLocation('');
    setSelectedSkills([]);
    setFilters(DEFAULT_FILTERS);
    setHasSearched(false);
    void setUrlParams({
      q: null, location: null, skills: null, budgetMin: null, budgetMax: null,
      budgetType: null, urgency: null, datePosted: null, sortBy: null,
    });
  };

  const handleFilterFieldChange = (field: keyof SearchFilters, value: string): void => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSortByChange = (sortBy: string): void => {
    setFilters((prev) => {
      const next = { ...prev, sortBy };
      void performSearch(next);
      return next;
    });
  };

  const openJob = (jobId: string): void => {
    router.push(`/jobs/${jobId}`);
  };

  return {
    searchQuery, setSearchQuery,
    selectedLocation, setSelectedLocation,
    selectedSkills,
    hasSearched,
    isSearchOpen, setSearchOpen,
    filters,
    viewMode, setViewMode,
    locationQuery, locationSuggestions, showLocationSuggestions,
    skillQuery, skillSuggestions, showSkillSuggestions,
    loading, jobs, totalResults, error,
    performSearch, handleLocationSearch, handleSkillSearch,
    addSkill, removeSkill, clearFilters, handleFilterFieldChange, handleSortByChange,
    openJob,
  };
}
