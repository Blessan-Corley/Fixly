export type PublicProfileRecord = {
  _id: string;
  name?: string;
  username?: string;
  bio?: string;
  skills?: string[];
  profilePhoto?: {
    url?: string | null;
  } | null;
  rating?: {
    average?: number;
    count?: number;
  };
  stats?: {
    completedJobs?: number;
  };
  role?: string;
  isVerified?: boolean;
  verification?: {
    status?: string;
  };
  plan?: {
    type?: string;
  };
  createdAt?: string;
  location?: {
    city?: string;
  };
};

export type UserReviewRecord = {
  _id: string;
  title?: string;
  comment?: string;
  createdAt?: string;
  rating?: {
    overall?: number;
  };
  reviewer?: {
    name?: string;
    username?: string;
  };
};
