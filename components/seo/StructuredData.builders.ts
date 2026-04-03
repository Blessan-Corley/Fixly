import { getSiteUrl } from '../../lib/siteUrl';

import type {
  BreadcrumbItem,
  FaqItem,
  JsonObject,
  JobSchemaInput,
  LocalBusinessData,
  ReviewInput,
  StructuredDataType,
} from './StructuredData.types';

const BASE_URL = getSiteUrl();

export function buildStructuredData(type: StructuredDataType, data: JsonObject): JsonObject | null {
  switch (type) {
    case 'organization':
      return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Fixly',
        description:
          'Hyperlocal service marketplace connecting homeowners with trusted local service professionals',
        url: BASE_URL,
        logo: `${BASE_URL}/icon-512x512.png`,
        sameAs: [
          'https://twitter.com/fixlyapp',
          'https://facebook.com/fixlyapp',
          'https://instagram.com/fixlyapp',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+91-XXXXXXXXXX',
          contactType: 'Customer Service',
          email: 'support@fixly.app',
          availableLanguage: 'English',
        },
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'IN',
          addressLocality: 'India',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
        ...data,
      };

    case 'website':
      return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Fixly - Hyperlocal Service Marketplace',
        alternateName: 'Fixly',
        url: BASE_URL,
        description:
          'Find trusted local service professionals for all your home and business needs',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Fixly',
          logo: {
            '@type': 'ImageObject',
            url: `${BASE_URL}/icon-512x512.png`,
          },
        },
        ...data,
      };

    case 'service':
      return {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: typeof data.name === 'string' ? data.name : 'Local Home Services',
        description:
          typeof data.description === 'string'
            ? data.description
            : 'Professional home repair and maintenance services',
        provider: {
          '@type': 'Organization',
          name: 'Fixly',
          url: BASE_URL,
        },
        serviceType: typeof data.serviceType === 'string' ? data.serviceType : 'Home Services',
        areaServed: {
          '@type': 'Place',
          name: typeof data.location === 'string' ? data.location : 'India',
        },
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: BASE_URL,
          serviceName: 'Fixly Platform',
        },
        ...data,
      };

    case 'breadcrumb': {
      const items = (Array.isArray(data.items) ? data.items : []) as BreadcrumbItem[];
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${BASE_URL}${item.url}`,
        })),
      };
    }

    case 'faq': {
      const questions = (Array.isArray(data.questions) ? data.questions : []) as FaqItem[];
      return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: questions.map((question) => ({
          '@type': 'Question',
          name: question.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: question.answer,
          },
        })),
      };
    }

    case 'localBusiness': {
      const localData = data as LocalBusinessData;
      return {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: localData.name || 'Local Service Provider',
        description: localData.description,
        address: {
          '@type': 'PostalAddress',
          streetAddress: localData.address?.street,
          addressLocality: localData.address?.city,
          addressRegion: localData.address?.state,
          postalCode: localData.address?.postalCode,
          addressCountry: 'IN',
        },
        geo: localData.coordinates
          ? {
              '@type': 'GeoCoordinates',
              latitude: localData.coordinates.lat,
              longitude: localData.coordinates.lng,
            }
          : undefined,
        telephone: localData.phone,
        priceRange: localData.priceRange,
        openingHoursSpecification: localData.hours?.map((hours) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: hours.day,
          opens: hours.open,
          closes: hours.close,
        })),
        aggregateRating: localData.rating
          ? {
              '@type': 'AggregateRating',
              ratingValue: localData.rating.average,
              reviewCount: localData.rating.count,
              bestRating: '5',
              worstRating: '1',
            }
          : undefined,
        ...data,
      };
    }

    default:
      return null;
  }
}

export function serializeStructuredData(payload: JsonObject): string {
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}

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
  if (!reviews || reviews.length === 0) {
    return null;
  }

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
