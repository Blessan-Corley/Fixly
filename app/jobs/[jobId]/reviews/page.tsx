import { Types } from 'mongoose';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { connectDB } from '@/lib/mongodb';
import Job from '@/models/Job';

import JobReviewsPageClient from './page.client';

type JobReviewsPageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

type JobRecord = {
  _id: unknown;
  title?: string;
};

async function getJobRecord(jobId: string): Promise<JobRecord | null> {
  if (!Types.ObjectId.isValid(jobId)) {
    return null;
  }

  await connectDB();
  const job = await Job.findById(jobId).select('title').lean<JobRecord | null>();
  return job;
}

export async function generateMetadata(props: JobReviewsPageProps): Promise<Metadata> {
  const params = await props.params;
  const job = await getJobRecord(params.jobId);

  if (!job) {
    return {
      title: 'Job Reviews — Fixly',
      description: 'Read reviews for a Fixly job.',
    };
  }

  return {
    title: `Reviews for ${job.title || 'this job'} — Fixly`,
    description: `Read reviews and ratings for ${job.title || 'this job'} on Fixly.`,
  };
}

export default async function JobReviewsPage(props: JobReviewsPageProps): Promise<JSX.Element> {
  const params = await props.params;
  const job = await getJobRecord(params.jobId);

  if (!job) {
    notFound();
  }

  return <JobReviewsPageClient jobId={params.jobId} jobTitle={job.title || 'Job'} />;
}
