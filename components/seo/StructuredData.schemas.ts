import { getSiteUrl } from '../../lib/siteUrl';

import type { JobSchemaInput, JsonObject, ReviewInput } from './StructuredData.types';

const BASE_URL = getSiteUrl();

export function generateJobPostingSchema(job: JobSchemaInput): JsonObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.createdAt,
    validThrough: job.deadline,
    employmentType: 'CONTRACT',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Fixly',
      sameAs: BASE_URL,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location?.city,
        addressRegion: job.location?.state,
        addressCountry: 'IN',
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'INR',
      value: {
        '@type': 'QuantitativeValue',
        value: job.budget?.amount,
        unitText: job.budget?.type === 'hourly' ? 'HOUR' : 'JOB',
      },
    },
    skills: job.skillsRequired,
    workHours: job.timeEstimate,
    jobBenefits: 'Flexible schedule, Direct payment, Build local reputation',
  };
}

export function generateReviewSchema(
  reviews: ReviewInput[] | null | undefined,
  businessName: string
): JsonObject | null {
  if (!reviews || reviews.length === 0) return null;

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: businessName,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: averageRating,
      reviewCount: reviews.length,
      bestRating: '5',
      worstRating: '1',
    },
    review: reviews.map((review) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name:
          `${review.reviewer?.firstName || ''} ${review.reviewer?.lastName || ''}`.trim() ||
          'Anonymous',
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: '5',
        worstRating: '1',
      },
      reviewBody: review.comment,
      datePublished: review.createdAt,
    })),
  };
}
