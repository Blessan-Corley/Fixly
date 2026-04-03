import { redirect } from 'next/navigation';

type JobMessagesPageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export default async function JobMessagesPage(props: JobMessagesPageProps) {
  const params = await props.params;
  redirect(`/dashboard/messages?job=${encodeURIComponent(params.jobId)}`);
}
