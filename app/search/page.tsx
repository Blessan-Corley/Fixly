import type { Metadata } from 'next';
import { Suspense } from 'react';

import SearchPageClient from './page.client';

type SearchPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function getFirstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }
  return typeof value === 'string' ? value : '';
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function generateMetadata(props: SearchPageProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const q = getFirstParam(searchParams?.q).trim();
  const location = getFirstParam(searchParams?.location).trim();
  const skills = getFirstParam(searchParams?.skills)
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

  const titleParts = ['Search Services'];
  if (q) titleParts.push(`"${q}"`);
  if (location) titleParts.push(`in ${location}`);
  const title = `${titleParts.join(' ')} | Fixly`;

  const descriptionBase =
    q || location || skills.length
      ? `Browse Fixly search results${q ? ` for ${q}` : ''}${location ? ` in ${location}` : ''}${
          skills.length ? ` with skills like ${skills.slice(0, 3).join(', ')}` : ''
        }.`
      : 'Search Fixly to find local service professionals and jobs in your area.';

  const canonicalParams = new URLSearchParams();
  if (q) canonicalParams.set('q', q);
  if (location) canonicalParams.set('location', location);
  if (skills.length) canonicalParams.set('skills', skills.join(','));
  const canonicalPath = canonicalParams.toString()
    ? `/search?${canonicalParams.toString()}`
    : '/search';
  const description = truncateText(descriptionBase, 160);

  return {
    title,
    description,
    robots: q
      ? {
          index: true,
          follow: true,
        }
      : {
          index: false,
          follow: true,
        },
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: 'website',
    },
    twitter: {
      title,
      description,
      card: 'summary',
    },
  };
}

export default function SearchPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-fixly-bg px-4 py-10">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="h-14 animate-pulse rounded-2xl bg-white" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`search-skeleton-${index}`}
                  className="h-72 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SearchPageClient />
    </Suspense>
  );
}
