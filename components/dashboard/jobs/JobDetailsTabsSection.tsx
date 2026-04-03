'use client';

import { FileText, MessageSquare, Users } from 'lucide-react';

import {
  formatDateValue,
  getTimeAgo,
  getTimeRemaining,
  handleAttachmentVideoClick,
  handleAttachmentVideoEnded,
} from '../../../app/dashboard/jobs/[jobId]/page.helpers';
import type {
  DashboardUser,
  JobApplication,
  JobAttachment,
  JobDetails,
} from '../../../app/dashboard/jobs/[jobId]/page.types';
import JobApplicationsTab from '../../jobs/JobApplicationsTab';

import JobDetailsOverviewTab from './JobDetailsOverviewTab';

type ActiveTab = 'details' | 'applications' | 'comments';

type TabIcon = typeof FileText;

type JobTab = {
  id: ActiveTab;
  label: string;
  icon: TabIcon;
  count?: number;
};

interface JobDetailsTabsSectionProps {
  activeTab: ActiveTab;
  applications: JobApplication[];
  commentsCount: number;
  experienceLevelLabel: string;
  isJobCreator: boolean;
  job: JobDetails;
  onAcceptApplication: (applicationId: string) => void;
  onImageSelect: (attachment: JobAttachment) => void;
  onMessageFixer: (fixerId: string) => void;
  onOpenComments: () => void;
  onRejectApplication: (applicationId: string) => void;
  onSelectTab: (tab: Exclude<ActiveTab, 'comments'>) => void;
  onUpgrade: () => void;
  user: DashboardUser | null;
}

const jobTabs = (applicationsCount: number, commentsCount: number): JobTab[] => [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'applications', label: 'Applications', icon: Users, count: applicationsCount },
  { id: 'comments', label: 'Comments', icon: MessageSquare, count: commentsCount },
];

export default function JobDetailsTabsSection({
  activeTab,
  applications,
  commentsCount,
  experienceLevelLabel,
  isJobCreator,
  job,
  onAcceptApplication,
  onImageSelect,
  onMessageFixer,
  onOpenComments,
  onRejectApplication,
  onSelectTab,
  onUpgrade,
  user,
}: JobDetailsTabsSectionProps): JSX.Element {
  return (
    <div className="card mb-8 p-0">
      <div className="border-b border-fixly-border">
        <nav className="flex">
          {jobTabs(applications.length, commentsCount).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'comments') {
                  onOpenComments();
                  return;
                }

                onSelectTab(tab.id);
              }}
              className={`flex items-center border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-fixly-accent text-fixly-accent'
                  : 'border-transparent text-fixly-text-muted hover:text-fixly-text'
              }`}
            >
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 rounded-full bg-fixly-accent/20 px-2 py-1 text-xs text-fixly-accent">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'details' && (
          <JobDetailsOverviewTab
            experienceLevelLabel={experienceLevelLabel}
            formatDateValue={formatDateValue}
            getTimeRemaining={getTimeRemaining}
            job={job}
            onAttachmentVideoClick={handleAttachmentVideoClick}
            onAttachmentVideoEnded={handleAttachmentVideoEnded}
            onImageSelect={onImageSelect}
            onUpgrade={onUpgrade}
            user={user}
          />
        )}

        {activeTab === 'applications' && (
          <JobApplicationsTab
            applications={applications}
            user={user}
            isJobCreator={isJobCreator}
            jobStatus={job.status}
            onMessageFixer={onMessageFixer}
            onRejectApplication={onRejectApplication}
            onAcceptApplication={onAcceptApplication}
            onUpgrade={onUpgrade}
            getTimeAgo={getTimeAgo}
          />
        )}
      </div>
    </div>
  );
}
