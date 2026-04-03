export type Coordinates = {
  lat: number;
  lng: number;
};

export type IndiaBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export const INDIA_BOUNDS: IndiaBounds = {
  north: 37.6,
  south: 6.4,
  east: 97.25,
  west: 68.7,
};

export function isWithinIndiaBounds(lat: number, lng: number): boolean {
  return (
    lat >= INDIA_BOUNDS.south &&
    lat <= INDIA_BOUNDS.north &&
    lng >= INDIA_BOUNDS.west &&
    lng <= INDIA_BOUNDS.east
  );
}

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
