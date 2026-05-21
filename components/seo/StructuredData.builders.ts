import { getSiteUrl } from '../../lib/siteUrl';

import type {
  BreadcrumbItem,
  FaqItem,
  JsonObject,
  LocalBusinessData,
  StructuredDataType,
} from './StructuredData.types';

export { generateJobPostingSchema, generateReviewSchema } from './StructuredData.schemas';

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
          contactType: 'Customer Service',
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
