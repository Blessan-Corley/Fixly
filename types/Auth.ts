import { UserRole, AuthMethod, UserLocation } from './User';

export interface SignupAddressInput {
  formattedAddress: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  doorNo?: string;
  street?: string;
  district?: string;
  state?: string;
  postalCode?: string;
}

export interface SignupCurrentLocationInput {
  lat: number;
  lng: number;
  source?: string;
}

export interface SignupLocationInput {
  homeAddress?: SignupAddressInput;
  currentLocation?: SignupCurrentLocationInput;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
}

export interface SignupRequest {
  authMethod: AuthMethod;
  email: string;
  name?: string;
  username?: string;
  password?: string;
  role: UserRole;
  phone?: string;
  location?: SignupLocationInput | UserLocation;
  skills?: string[];
  googleId?: string;
  picture?: string;
  isGoogleCompletion?: boolean;
  firebaseUid?: string;
  termsAccepted?: boolean;
}

export interface SignupResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    skills?: string[];
    isVerified: boolean;
    authMethod: string;
    isRegistered: boolean;
  };
  redirect?: string;
  errors?: string[] | Array<Record<string, unknown>>;
  code?: string;
}
