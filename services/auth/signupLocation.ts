import type { SignupCurrentLocationInput, SignupLocationInput } from '../../types/Auth';
import type { UserLocation } from '../../types/User';

type CoordinatesInput = {
  lat?: number;
  lng?: number;
};

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toCoordinates(coordinates?: CoordinatesInput): UserLocation['coordinates'] {
  if (!coordinates) {
    return undefined;
  }

  if (isFiniteCoordinate(coordinates.lat) && isFiniteCoordinate(coordinates.lng)) {
    return {
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    };
  }

  return undefined;
}

function getCoordinates(location?: SignupLocationInput): UserLocation['coordinates'] {
  if (!location) {
    return undefined;
  }

  const currentLocation: SignupCurrentLocationInput | undefined = location.currentLocation;
  const currentCoordinates = toCoordinates(currentLocation);
  if (currentCoordinates) {
    return currentCoordinates;
  }

  const homeCoordinates = toCoordinates(location.homeAddress?.coordinates);
  if (homeCoordinates) {
    return homeCoordinates;
  }

  return toCoordinates(location);
}

export function normalizeSignupLocation(
  location?: SignupLocationInput | UserLocation
): UserLocation | undefined {
  if (!location) {
    return undefined;
  }

  const asUserLocation = location as UserLocation;
  if (
    isFiniteCoordinate(asUserLocation.coordinates?.latitude) &&
    isFiniteCoordinate(asUserLocation.coordinates?.longitude)
  ) {
    return asUserLocation;
  }

  const signupLocation = location as SignupLocationInput;
  const coordinates = getCoordinates(signupLocation);
  const formattedAddress = signupLocation.homeAddress?.formattedAddress;

  if (!coordinates && !formattedAddress && !signupLocation.city && !signupLocation.state) {
    return undefined;
  }

  return {
    coordinates,
    address: formattedAddress,
    city: signupLocation.city,
    state: signupLocation.state,
    source: signupLocation.currentLocation?.source as UserLocation['source'],
    homeAddress: signupLocation.homeAddress
      ? {
          doorNo: signupLocation.homeAddress.doorNo,
          street: signupLocation.homeAddress.street,
          district: signupLocation.homeAddress.district,
          state: signupLocation.homeAddress.state,
          postalCode: signupLocation.homeAddress.postalCode,
          formattedAddress: signupLocation.homeAddress.formattedAddress,
          coordinates: toCoordinates(signupLocation.homeAddress.coordinates),
        }
      : undefined,
  };
}
