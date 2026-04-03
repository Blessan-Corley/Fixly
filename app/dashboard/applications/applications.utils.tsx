import { AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ApplicationItem, ApplicationStatus } from './applications.types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function getStatusColor(status: ApplicationStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'accepted':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'withdrawn':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getStatusIcon(status: ApplicationStatus): ReactNode {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'accepted':
      return <CheckCircle className="h-4 w-4" />;
    case 'rejected':
      return <X className="h-4 w-4" />;
    case 'withdrawn':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

export function toApplication(value: unknown): ApplicationItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const jobRaw = isRecord(value.job) ? value.job : {};
  const locationRaw = isRecord(jobRaw.location) ? jobRaw.location : {};
  const createdByRaw = isRecord(jobRaw.createdBy) ? jobRaw.createdBy : {};
  const ratingRaw = isRecord(createdByRaw.rating) ? createdByRaw.rating : {};
  const timeEstimateRaw = isRecord(value.timeEstimate) ? value.timeEstimate : null;

  return {
    _id: asString(value._id, ''),
    status: asString(value.status, 'pending'),
    proposedAmount: asNumber(value.proposedAmount, 0),
    appliedAt: asString(value.appliedAt, new Date().toISOString()),
    timeEstimate: timeEstimateRaw
      ? {
          value: asNumber(timeEstimateRaw.value, 0),
          unit: asString(timeEstimateRaw.unit, ''),
        }
      : undefined,
    coverLetter: asString(value.coverLetter, ''),
    job: {
      _id: asString(jobRaw._id, ''),
      title: asString(jobRaw.title, 'Untitled Job'),
      description: asString(jobRaw.description, ''),
      featured: Boolean(jobRaw.featured),
      location: {
        city: asString(locationRaw.city, 'Unknown'),
      },
      createdBy: {
        name: asString(createdByRaw.name, 'Unknown'),
        photoURL: asString(createdByRaw.photoURL, '/default-avatar.png'),
        rating: {
          average: typeof ratingRaw.average === 'number' ? ratingRaw.average : undefined,
        },
      },
    },
  };
}
