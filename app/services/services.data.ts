import { Brush, Car, Droplets, Hammer, Home, Laptop, TreePine, Zap } from 'lucide-react';
import type { ElementType } from 'react';

export type ServiceCategory = {
  id: string;
  name: string;
  icon: ElementType;
  description: string;
  services: string[];
  color: string;
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'electrical',
    name: 'Electrical',
    icon: Zap,
    description: 'Wiring, outlets, fixtures, and electrical repairs',
    services: [
      'Outlet Installation',
      'Light Fixture Repair',
      'Electrical Wiring',
      'Circuit Breaker Repair',
      'Ceiling Fan Installation',
    ],
    color: 'bg-yellow-500',
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: Droplets,
    description: 'Pipes, drains, faucets, and water systems',
    services: [
      'Leak Repair',
      'Drain Cleaning',
      'Faucet Installation',
      'Toilet Repair',
      'Water Heater Service',
    ],
    color: 'bg-blue-500',
  },
  {
    id: 'handyman',
    name: 'Handyman',
    icon: Hammer,
    description: 'General repairs, maintenance, and installations',
    services: [
      'Furniture Assembly',
      'Wall Mounting',
      'Door Repair',
      'Window Fixing',
      'General Maintenance',
    ],
    color: 'bg-orange-500',
  },
  {
    id: 'automotive',
    name: 'Automotive',
    icon: Car,
    description: 'Car repairs, maintenance, and diagnostics',
    services: [
      'Oil Change',
      'Brake Repair',
      'Battery Replacement',
      'Tire Service',
      'Engine Diagnostics',
    ],
    color: 'bg-red-500',
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: Brush,
    description: 'Interior and exterior painting services',
    services: [
      'Interior Painting',
      'Exterior Painting',
      'Wall Prep',
      'Touch-up Repairs',
      'Color Consultation',
    ],
    color: 'bg-fixly-primary',
  },
  {
    id: 'technology',
    name: 'Technology',
    icon: Laptop,
    description: 'Computer repair, setup, and tech support',
    services: [
      'Computer Repair',
      'WiFi Setup',
      'Smart Home Installation',
      'Data Recovery',
      'Software Installation',
    ],
    color: 'bg-green-500',
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    icon: TreePine,
    description: 'Garden, lawn, and outdoor maintenance',
    services: [
      'Lawn Mowing',
      'Garden Design',
      'Tree Trimming',
      'Irrigation Systems',
      'Landscape Maintenance',
    ],
    color: 'bg-emerald-500',
  },
  {
    id: 'home-improvement',
    name: 'Home Improvement',
    icon: Home,
    description: 'Renovations, upgrades, and home projects',
    services: [
      'Kitchen Renovation',
      'Bathroom Remodel',
      'Flooring Installation',
      'Cabinet Installation',
      'Tile Work',
    ],
    color: 'bg-indigo-500',
  },
];
