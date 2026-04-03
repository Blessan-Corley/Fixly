'use client';

import type { PublicProfileRecord } from './_lib/publicProfile.types';

type PublicProfileBodyProps = {
  profile: PublicProfileRecord;
  averageRating: string;
  ratingsCount: number;
  completedJobs: number;
  skills: string[];
};

export default function PublicProfileBody({
  profile,
  averageRating,
  ratingsCount,
  completedJobs,
  skills,
}: PublicProfileBodyProps): React.JSX.Element {
  const isVerified =
    profile.isVerified === true || profile.verification?.status === 'approved';

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-fixly-bg px-5 py-4">
          <p className="text-sm text-fixly-text-muted">Rating</p>
          <p className="mt-1 text-2xl font-semibold text-fixly-text">
            {averageRating}
            <span className="ml-2 text-sm font-normal text-fixly-text-muted">
              ({ratingsCount} reviews)
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-fixly-bg px-5 py-4">
          <p className="text-sm text-fixly-text-muted">Jobs Completed</p>
          <p className="mt-1 text-2xl font-semibold text-fixly-text">{completedJobs}</p>
        </div>
        <div className="rounded-2xl bg-fixly-bg px-5 py-4">
          <p className="text-sm text-fixly-text-muted">Verification</p>
          <p className="mt-1 text-2xl font-semibold text-fixly-text">
            {isVerified ? 'Verified' : 'Pending'}
          </p>
        </div>
      </div>

      {profile.bio ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-fixly-text">About</h2>
          <p className="mt-3 leading-7 text-fixly-text-muted">{profile.bio}</p>
        </section>
      ) : null}

      {skills.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-fixly-text">Skills</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-fixly-accent/10 px-3 py-1 text-sm font-medium text-fixly-accent"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
