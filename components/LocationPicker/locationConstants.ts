import type { IndiaBounds, MajorIndianCity } from './locationUtils.types';

export const INDIA_BOUNDS: IndiaBounds = {
  north: 37.6,
  south: 6.4,
  east: 97.25,
  west: 68.7,
};

export const MAJOR_INDIAN_CITIES: MajorIndianCity[] = [
  { name: 'Mumbai', lat: 19.076, lng: 72.8777, state: 'Maharashtra' },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025, state: 'Delhi' },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867, state: 'Telangana' },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
  { name: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, state: 'Gujarat' },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
  { name: 'Surat', lat: 21.1702, lng: 72.8311, state: 'Gujarat' },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462, state: 'Uttar Pradesh' },
  { name: 'Kanpur', lat: 26.4499, lng: 80.3319, state: 'Uttar Pradesh' },
  { name: 'Nagpur', lat: 21.1458, lng: 79.0882, state: 'Maharashtra' },
  { name: 'Indore', lat: 22.7196, lng: 75.8577, state: 'Madhya Pradesh' },
  { name: 'Thane', lat: 19.2183, lng: 72.9781, state: 'Maharashtra' },
  { name: 'Bhopal', lat: 23.2599, lng: 77.4126, state: 'Madhya Pradesh' },
  { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185, state: 'Andhra Pradesh' },
  { name: 'Vadodara', lat: 22.3072, lng: 73.1812, state: 'Gujarat' },
  { name: 'Firozabad', lat: 27.1592, lng: 78.3957, state: 'Uttar Pradesh' },
  { name: 'Ludhiana', lat: 30.901, lng: 75.8573, state: 'Punjab' },
];

export const isWithinIndiaBounds = (lat: number, lng: number): boolean =>
  lat >= INDIA_BOUNDS.south &&
  lat <= INDIA_BOUNDS.north &&
  lng >= INDIA_BOUNDS.west &&
  lng <= INDIA_BOUNDS.east;
