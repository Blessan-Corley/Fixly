// components/seo/StructuredData.js - JSON-LD structured data for SEO
'use client';

import { useEffect } from 'react';

export default function StructuredData({ type = 'organization', data = {} }) {
  useEffect(() => {
    // Remove any existing structured data
    const existingScript = document.getElementById('structured-data');
    if (existingScript) {
      existingScript.remove();
    }

    let structuredData;

    switch (type) {
      case 'organization':
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Fixly",
          "description": "Hyperlocal service marketplace connecting homeowners with trusted local service professionals",
          "url": process.env.NEXTAUTH_URL || "https://fixly.app",
          "logo": `${process.env.NEXTAUTH_URL || "https://fixly.app"}/icon-512x512.png`,
          "sameAs": [
            "https://twitter.com/fixlyapp",
            "https://facebook.com/fixlyapp",
            "https://instagram.com/fixlyapp"
          ],
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+91-XXXXXXXXXX",
            "contactType": "Customer Service",
            "email": "support@fixly.app",
            "availableLanguage": "English"
          },
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "IN",
            "addressLocality": "India"
          },
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": `${process.env.NEXTAUTH_URL || "https://fixly.app"}/search?q={search_term_string}`
            },
            "query-input": "required name=search_term_string"
          },
          ...data
        };
        break;

      case 'website':
        structuredData = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Fixly - Hyperlocal Service Marketplace",
          "alternateName": "Fixly",
          "url": process.env.NEXTAUTH_URL || "https://fixly.app",
          "description": "Find trusted local service professionals for all your home and business needs",
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": `${process.env.NEXTAUTH_URL || "https://fixly.app"}/search?q={search_term_string}`
            },
            "query-input": "required name=search_term_string"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Fixly",
            "logo": {
              "@type": "ImageObject",
              "url": `${process.env.NEXTAUTH_URL || "https://fixly.app"}/icon-512x512.png`
            }
          },
          ...data
        };
        break;

      case 'service':
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Service",
          "name": data.name || "Local Home Services",
          "description": data.description || "Professional home repair and maintenance services",
          "provider": {
            "@type": "Organization",
            "name": "Fixly",
            "url": process.env.NEXTAUTH_URL || "https://fixly.app"
          },
          "serviceType": data.serviceType || "Home Services",
          "areaServed": {
            "@type": "Place",
            "name": data.location || "India"
          },
          "availableChannel": {
            "@type": "ServiceChannel",
            "serviceUrl": process.env.NEXTAUTH_URL || "https://fixly.app",
            "serviceName": "Fixly Platform"
          },
          ...data
        };
        break;

      case 'breadcrumb':
        structuredData = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": data.items?.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": `${process.env.NEXTAUTH_URL || "https://fixly.app"}${item.url}`
          })) || []
        };
        break;

      case 'faq':
        structuredData = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": data.questions?.map(q => ({
            "@type": "Question",
            "name": q.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": q.answer
            }
          })) || []
        };
        break;

      case 'localBusiness':
        structuredData = {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": data.name || "Local Service Provider",
          "description": data.description,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": data.address?.street,
            "addressLocality": data.address?.city,
            "addressRegion": data.address?.state,
            "postalCode": data.address?.postalCode,
            "addressCountry": "IN"
          },
          "geo": data.coordinates ? {
            "@type": "GeoCoordinates",
            "latitude": data.coordinates.lat,
            "longitude": data.coordinates.lng
          } : undefined,
          "telephone": data.phone,
          "priceRange": data.priceRange,
          "openingHoursSpecification": data.hours?.map(h => ({
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": h.day,
            "opens": h.open,
            "closes": h.close
          })),
          "aggregateRating": data.rating ? {
            "@type": "AggregateRating",
            "ratingValue": data.rating.average,
            "reviewCount": data.rating.count,
            "bestRating": "5",
            "worstRating": "1"
          } : undefined,
          ...data
        };
        break;

      default:
        console.warn(`Unknown structured data type: ${type}`);
        return;
    }

    // Create and inject script
    const script = document.createElement('script');
    script.id = 'structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData, null, 2);
    document.head.appendChild(script);

  }, [type, data]);

  return null; // This component doesn't render anything visible
}

// Utility function to generate structured data for job postings
export function generateJobPostingSchema(job) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description,
    "datePosted": job.createdAt,
    "validThrough": job.deadline,
    "employmentType": "CONTRACT",
    "hiringOrganization": {
      "@type": "Organization",
      "name": "Fixly",
      "sameAs": process.env.NEXTAUTH_URL || "https://fixly.app"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.location?.city,
        "addressRegion": job.location?.state,
        "addressCountry": "IN"
      }
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": "INR",
      "value": {
        "@type": "QuantitativeValue",
        "value": job.budget?.amount,
        "unitText": job.budget?.type === "hourly" ? "HOUR" : "JOB"
      }
    },
    "skills": job.skillsRequired,
    "workHours": job.timeEstimate,
    "jobBenefits": "Flexible schedule, Direct payment, Build local reputation"
  };
}

// Utility function to generate review schema
export function generateReviewSchema(reviews, businessName) {
  if (!reviews || reviews.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": businessName,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
      "reviewCount": reviews.length,
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": reviews.map(review => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": review.reviewer?.firstName + " " + review.reviewer?.lastName
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating,
        "bestRating": "5",
        "worstRating": "1"
      },
      "reviewBody": review.comment,
      "datePublished": review.createdAt
    }))
  };
}