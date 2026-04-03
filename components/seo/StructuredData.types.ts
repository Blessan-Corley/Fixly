export type StructuredDataType =
  | 'organization'
  | 'website'
  | 'service'
  | 'breadcrumb'
  | 'faq'
  | 'localBusiness';

export type JsonObject = Record<string, unknown>;

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface LocalBusinessHours {
  day: string;
  open: string;
  close: string;
}

export interface LocalBusinessData {
  name?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  coordinates?: {
    lat?: number;
    lng?: number;
  };
  phone?: string;
  priceRange?: string;
  hours?: LocalBusinessHours[];
  rating?: {
    average?: number;
    count?: number;
  };
  [key: string]: unknown;
}

export interface StructuredDataProps {
  type?: StructuredDataType;
  data?: JsonObject;
  idSuffix?: string;
}

export interface JobSchemaInput {
  title?: string;
  description?: string;
  createdAt?: string;
  deadline?: string;
  location?: {
    city?: string;
    state?: string;
  };
  budget?: {
    amount?: number;
    type?: string;
  };
  skillsRequired?: string[];
  timeEstimate?: string;
}

export interface ReviewInput {
  rating: number;
  comment?: string;
  createdAt?: string;
  reviewer?: {
    firstName?: string;
    lastName?: string;
  };
}
