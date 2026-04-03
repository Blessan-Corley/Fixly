export type SortBy = 'rating' | 'reviews' | 'recent' | 'distance';

export interface FixerRating {
  average: number;
  count: number;
}

export interface FixerLocation {
  city: string;
  state: string;
}

export interface FixerReview {
  rating: number;
  comment: string;
  createdAt: string;
}

export interface FixerProfile {
  _id: string;
  name: string;
  username: string;
  profilePhoto: string;
  skills: string[];
  jobsCompleted: number;
  responseTime: string;
  isVerified: boolean;
  bio: string;
  location: FixerLocation;
  rating: FixerRating;
  recentReviews: FixerReview[];
}

export interface SearchPagination {
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SearchFilters {
  search: string;
  location: string;
  skills: string[];
  minRating: string;
  maxDistance: string;
  availability: string;
  priceRange: string;
  sortBy: SortBy;
}

export interface SearchResponse {
  users?: unknown[];
  pagination?: {
    page?: number;
    totalPages?: number;
    hasMore?: boolean;
  };
  message?: string;
}

export interface ProfileModalProps {
  fixer: FixerProfile;
  onClose: () => void;
  onContact: () => void;
}

export interface MessageModalProps {
  fixer: FixerProfile;
  onClose: () => void;
}

export const DEFAULT_PAGINATION: SearchPagination = {
  page: 1,
  totalPages: 1,
  hasMore: false,
};

export const DEFAULT_FILTERS: SearchFilters = {
  search: '',
  location: '',
  skills: [],
  minRating: '',
  maxDistance: '',
  availability: '',
  priceRange: '',
  sortBy: 'rating',
};
