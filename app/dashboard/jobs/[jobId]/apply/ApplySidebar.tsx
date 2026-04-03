'use client';

import { CheckCircle, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { JobDetails } from './apply.types';

type ApplySidebarProps = {
  job: JobDetails;
  remainingCredits: string;
  planType: string;
  userSkills: string[];
};

const PRO_TIPS = [
  'Be specific about your experience with similar projects',
  'Include realistic timeframes and competitive pricing',
  'Ask relevant questions to show you understand the project',
];

export default function ApplySidebar({
  job,
  remainingCredits,
  planType,
  userSkills,
}: ApplySidebarProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Pro Tips */}
      <div className="card">
        <h3 className="mb-4 flex items-center text-lg font-semibold text-fixly-text">
          <Zap className="mr-2 h-5 w-5 text-fixly-accent" />
          Pro Tips
        </h3>
        <div className="space-y-3 text-sm">
          {PRO_TIPS.map((tip) => (
            <div key={tip} className="flex items-start">
              <div className="mr-2 mt-0.5 rounded-full bg-green-50 p-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <p className="text-fixly-text-light">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Application Credits */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-fixly-text">Application Credits</h3>
        <div className="text-sm">
          <p className="mb-2 text-fixly-text-light">
            You have <span className="font-semibold text-fixly-accent">{remainingCredits}</span>{' '}
            applications remaining.
          </p>
          {planType !== 'pro' && (
            <div className="rounded-lg bg-fixly-accent-light p-3">
              <p className="mb-1 font-medium text-fixly-text">Upgrade to Pro</p>
              <p className="mb-2 text-xs text-fixly-text-light">
                Get unlimited applications plus priority support
              </p>
              <button
                onClick={() => router.push('/dashboard/subscription')}
                className="btn-primary w-full text-xs"
              >
                Upgrade Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Required Skills */}
      {job.skillsRequired.length > 0 && (
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-fixly-text">Required Skills</h3>
          <div className="flex flex-wrap gap-2">
            {job.skillsRequired.map((skill, index) => {
              const hasSkill = userSkills.includes(skill.toLowerCase());
              return (
                <span
                  key={`${skill}-${index}`}
                  className={`skill-chip text-xs ${hasSkill ? 'skill-chip-selected' : ''}`}
                >
                  {skill}
                  {hasSkill && <CheckCircle className="ml-1 h-3 w-3" />}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
