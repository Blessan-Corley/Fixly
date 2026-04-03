export type RouteParams = {
  username?: string | string[];
};

export type ProfileUser = {
  _id: string;
  name: string;
  username: string;
  role?: 'hirer' | 'fixer' | 'admin' | string;
  photoURL?: string;
};

export type DetailedRatingGroup = {
  [key: string]: number | string | undefined;
};

export type RatingStats = {
  total: number;
  average: number;
  distribution: Record<string, number>;
  detailed?: {
    asFixer?: DetailedRatingGroup;
    asClient?: DetailedRatingGroup;
  };
};

export type ReviewVote = {
  count: number;
  users: string[];
};

export type ReviewResponse = {
  comment: string;
  respondedAt?: string;
};

export type ReviewItem = {
  _id: string;
  reviewer: {
    _id: string;
    name: string;
    username: string;
    photoURL?: string;
  };
  reviewType: 'client_to_fixer' | 'fixer_to_client' | string;
  rating: {
    overall: number;
  };
  createdAt: string;
  job?: {
    title?: string;
  };
  title: string;
  comment: string;
  pros: string[];
  cons: string[];
  tags: string[];
  response?: ReviewResponse;
  helpfulVotes: ReviewVote;
  wouldRecommend?: boolean;
};

export type ReviewFilters = {
  reviewType: 'all' | 'client_to_fixer' | 'fixer_to_client';
  rating: 'all' | '1' | '2' | '3' | '4' | '5';
  sortBy: 'createdAt' | 'rating.overall' | 'helpfulVotes.count';
  search: string;
};

export type PaginationState = {
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
};

export type ReviewsApiPayload = {
  success?: boolean;
  message?: string;
  reviews?: ReviewItem[];
  ratingStats?: RatingStats | null;
  pagination?: PaginationState;
};

export type ProfileApiPayload = {
  success?: boolean;
  message?: string;
  user?: ProfileUser;
};

export type HelpfulVotePayload = {
  success?: boolean;
  message?: string;
  helpfulCount?: number;
  action?: 'added' | 'removed' | string;
};
