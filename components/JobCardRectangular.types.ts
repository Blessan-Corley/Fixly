export interface JobBudget {
  type?: 'fixed' | 'negotiable' | 'hourly' | string;
  amount?: number;
  materialsIncluded?: boolean;
}

export interface JobLocation {
  city?: string;
  lat?: number;
  lng?: number;
}

export interface JobCardData {
  _id: string;
  title?: string;
  description?: string;
  urgency?: string;
  createdAt?: string | Date;
  deadline?: string | Date;
  budget?: JobBudget;
  viewCount?: number;
  views?: {
    count?: number;
  };
  location?: JobLocation;
  skillsRequired?: string[];
  applicationCount?: number;
  applications?: unknown[];
  commentCount?: number;
}

export interface UserData {
  id?: string;
  _id?: string;
  role?: string;
  skills?: string[];
  photoURL?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface JobCardRectangularProps {
  job: JobCardData;
  user?: UserData | null;
  onApply?: (jobId: string) => Promise<void> | void;
  isApplying?: boolean;
  userLocation?: Coordinates | null;
  showDistance?: boolean;
  onClick?: (job: JobCardData) => void;
}

export interface DeadlineInfo {
  text: string;
  color: string;
  bgColor: string;
  urgent: boolean;
}
