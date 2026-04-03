export interface UserNotification {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  read?: boolean;
  createdAt?: Date;
  readAt?: Date;
  [key: string]: unknown;
}

export interface RatingCategory {
  [key: string]: number;
}

export interface UserRating {
  average: number;
  count: number;
  distribution: { [key: number]: number };
  fixerRatings?: {
    communication: number;
    quality: number;
    timeliness: number;
    professionalism: number;
  };
  hirerRatings?: {
    clarity: number;
    responsiveness: number;
    paymentTimeliness: number;
    professionalism: number;
  };
}
