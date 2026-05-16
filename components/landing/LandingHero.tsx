'use client';

import { MapPin, Search, Star, Wrench } from 'lucide-react';

type LandingHeroProps = {
  onHireService: () => void;
  onProvideService: () => void;
};

export default function LandingHero({ onHireService, onProvideService }: LandingHeroProps) {
  return (
    <section className="px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — copy + CTAs */}
          <div>
            <div className="mb-4 inline-flex rounded-full border border-fixly-accent/30 bg-fixly-accent/10 px-4 py-1.5 text-sm font-semibold text-fixly-accent">
              India&apos;s local services marketplace
            </div>
            <h1 className="mb-6 text-4xl font-bold text-fixly-text md:text-5xl lg:text-6xl">
              Trusted Fixers,
              <span className="block text-fixly-accent">Right in Your City</span>
            </h1>

            <p className="mb-8 max-w-xl text-xl text-fixly-text-light">
              Post any home or business job — plumbing, electrical, carpentry, cleaning and more.
              Get quotes from verified local professionals and pay only when the work is done.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <button onClick={onHireService} className="btn-primary hover-lift px-8 py-4 text-lg">
                <Search className="mr-2 h-5 w-5" aria-hidden="true" />
                Post a Job
              </button>
              <button
                onClick={onProvideService}
                className="btn-secondary hover-lift px-8 py-4 text-lg"
              >
                <Wrench className="mr-2 h-5 w-5" aria-hidden="true" />
                Become a Fixer
              </button>
            </div>
          </div>

          {/* Right — product preview card */}
          <div className="hidden lg:block" aria-hidden="true">
            <div className="relative mx-auto max-w-sm">
              {/* Decorative glow */}
              <div className="absolute inset-0 -m-4 rounded-3xl bg-fixly-accent/10 blur-2xl" />

              {/* App-style card */}
              <div className="relative rounded-2xl border border-fixly-border bg-fixly-card p-6 shadow-2xl">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-fixly-text-muted">
                  Latest job posted
                </p>

                {/* Job card mock */}
                <div className="mb-4 rounded-xl border border-fixly-border bg-fixly-bg p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="rounded-full bg-fixly-accent/10 px-2 py-0.5 text-xs font-medium text-fixly-accent">
                      Electrical
                    </span>
                    <span className="text-sm font-semibold text-fixly-text">₹2,500</span>
                  </div>
                  <p className="mb-1 font-semibold text-fixly-text">Fix electrical short circuit</p>
                  <p className="mb-3 text-sm text-fixly-text-muted">
                    Lights flickering in 2 rooms, needs urgent attention.
                  </p>
                  <div className="flex items-center gap-1 text-xs text-fixly-text-muted">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span>Bengaluru, Karnataka</span>
                  </div>
                </div>

                {/* Fixer cards */}
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-fixly-text-muted">
                  3 fixers responded
                </p>
                {[
                  { name: 'Ravi K.', rating: '4.9', jobs: '128 jobs' },
                  { name: 'Priya M.', rating: '4.8', jobs: '94 jobs' },
                ].map((fixer) => (
                  <div
                    key={fixer.name}
                    className="mb-2 flex items-center justify-between rounded-lg border border-fixly-border bg-fixly-bg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fixly-accent/20 text-xs font-bold text-fixly-accent">
                        {fixer.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-fixly-text">{fixer.name}</p>
                        <p className="text-xs text-fixly-text-muted">{fixer.jobs}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-fixly-text">
                      <Star className="h-3 w-3 fill-fixly-accent text-fixly-accent" />
                      {fixer.rating}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
