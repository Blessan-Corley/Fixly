import { Types } from 'mongoose';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { connectDB } from '@/lib/mongodb';
import Job from '@/models/Job';

import JobDetailsPageClient from './page.client';

type JobPageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

type JobSeoRecord = {
  _id?: unknown;
  title?: string;
  description?: string;
  status?: string;
  location?: {
    city?: string;
    state?: string;
  };
};

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

async function getJobSeoData(jobId: string): Promise<JobSeoRecord | null> {
  if (!Types.ObjectId.isValid(jobId)) {
    return null;
  }

  try {
    await connectDB();
    const job = await Job.findById(jobId)
      .select('title description status location.city location.state')
      .lean();
    return (job ?? null) as JobSeoRecord | null;
  } catch (error: unknown) {
    console.error('Failed to load job SEO metadata:', error);
    return null;
  }
}

export async function generateMetadata(props: JobPageProps): Promise<Metadata> {
  const params = await props.params;
  const jobId = typeof params.jobId === 'string' ? params.jobId : '';
  const job = await getJobSeoData(jobId);

  if (!job) {
    return {
      title: 'Job Details | Fixly',
      description: 'View job details on Fixly and connect with local service professionals.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const city = typeof job.location?.city === 'string' ? job.location.city : '';
  const state = typeof job.location?.state === 'string' ? job.location.state : '';
  const locationLabel = [city, state].filter(Boolean).join(', ');
  const statusLabel = typeof job.status === 'string' ? job.status.replace(/_/g, ' ') : 'open';
  const baseTitle =
    typeof job.title === 'string' && job.title.trim() ? job.title.trim() : 'Job Details';
  const title = `${baseTitle} | Fixly`;
  const descriptionSource =
    typeof job.description === 'string' && job.description.trim()
      ? job.description.trim()
      : `View this ${statusLabel} job opportunity on Fixly${locationLabel ? ` in ${locationLabel}` : ''}.`;
  const description = truncateText(descriptionSource, 160);
  const canonicalPath = `/jobs/${jobId}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: 'article',
    },
    twitter: {
      title,
      description,
      card: 'summary_large_image',
    },
  };
}

export default function JobDetailsPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-fixly-bg px-4 py-10">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="h-80 animate-pulse rounded-3xl bg-white" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr,1fr]">
              <div className="h-96 animate-pulse rounded-3xl bg-white" />
              <div className="h-80 animate-pulse rounded-3xl bg-white" />
            </div>
          </div>
        </div>
      }
    >
      <JobDetailsPageClient />
    </Suspense>
  );
}
