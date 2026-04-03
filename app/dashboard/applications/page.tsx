'use client';

import { Briefcase, CheckCircle, Clock, Loader, Search, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  useFixerApplicationsQuery,
  useWithdrawApplicationMutation,
} from '@/hooks/query/applications';

import { RoleGuard } from '../../providers';

import ApplicationFilterBar from './ApplicationFilterBar';
import ApplicationListItem from './ApplicationListItem';
import type { ApplicationItem, FilterState, StatCard } from './applications.types';
import { isRecord, toApplication } from './applications.utils';
import ApplicationStatCards from './ApplicationStatCards';

export default function ApplicationsPage() {
  return (
    <RoleGuard roles={['fixer']} fallback={<div>Access denied</div>}>
      <ApplicationsContent />
    </RoleGuard>
  );
}

function ApplicationsContent() {
  const router = useRouter();

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [filters, setFilters] = useState<FilterState>({ status: 'all', search: '' });

  const {
    data: applicationsResponse,
    isLoading: applicationsLoading,
    isFetching: applicationsFetching,
    refetch: refetchApplications,
  } = useFixerApplicationsQuery({
    status: filters.status !== 'all' ? filters.status : undefined,
    search: filters.search,
  });

  const { mutateAsync: withdrawApplicationMutation } = useWithdrawApplicationMutation();

  useEffect(() => {
    const payload = isRecord(applicationsResponse) ? applicationsResponse : {};
    if (!Array.isArray(payload.applications)) {
      setApplications([]);
      return;
    }
    const parsed = payload.applications
      .map((app) => toApplication(app))
      .filter((app): app is ApplicationItem => app !== null);
    setApplications(parsed);
  }, [applicationsResponse]);

  const withdrawApplication = async (jobId: string): Promise<void> => {
    try {
      await withdrawApplicationMutation({ jobId, reason: 'withdrawn_by_user' });
      void refetchApplications();
      toast.success('Application withdrawn successfully');
    } catch (error: unknown) {
      console.error('Error withdrawing application:', error);
      toast.error('Failed to withdraw application');
    }
  };

  if (applicationsLoading || applicationsFetching) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
        </div>
      </div>
    );
  }

  const acceptedCount = applications.filter((a) => a.status === 'accepted').length;
  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const successRate =
    applications.length > 0 ? `${Math.round((acceptedCount / applications.length) * 100)}%` : '0%';

  const statCards: StatCard[] = [
    {
      label: 'Total Applications',
      value: applications.length,
      icon: Briefcase,
      containerClass: 'bg-blue-100',
      iconClass: 'text-blue-600',
    },
    {
      label: 'Pending',
      value: pendingCount,
      icon: Clock,
      containerClass: 'bg-yellow-100',
      iconClass: 'text-yellow-600',
    },
    {
      label: 'Accepted',
      value: acceptedCount,
      icon: CheckCircle,
      containerClass: 'bg-green-100',
      iconClass: 'text-green-600',
    },
    {
      label: 'Success Rate',
      value: successRate,
      icon: Star,
      containerClass: 'bg-teal-100',
      iconClass: 'text-teal-600',
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between lg:flex-row lg:items-center">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-fixly-text">My Applications</h1>
          <p className="text-fixly-text-light">Track your job applications and their status</p>
        </div>
        <div className="mt-4 flex items-center space-x-4 lg:mt-0">
          <button
            onClick={() => router.push('/dashboard/browse-jobs')}
            className="btn-primary flex items-center"
          >
            <Search className="mr-2 h-4 w-4" />
            Browse More Jobs
          </button>
        </div>
      </div>

      <ApplicationStatCards statCards={statCards} />

      <ApplicationFilterBar
        filters={filters}
        onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
        onStatusChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
      />

      {/* Applications list */}
      {applications.length === 0 ? (
        <div className="py-12 text-center">
          <Briefcase className="mx-auto mb-4 h-12 w-12 text-fixly-text-muted" />
          <h3 className="mb-2 text-lg font-medium text-fixly-text">No applications yet</h3>
          <p className="mb-4 text-fixly-text-muted">Start applying to jobs to see them here</p>
          <button onClick={() => router.push('/dashboard/browse-jobs')} className="btn-primary">
            Browse Jobs
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((application, index) => (
            <ApplicationListItem
              key={application._id}
              application={application}
              index={index}
              onWithdraw={withdrawApplication}
            />
          ))}
        </div>
      )}
    </div>
  );
}
