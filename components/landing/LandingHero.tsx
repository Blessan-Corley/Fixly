'use client';

import { Search, Wrench } from 'lucide-react';

type LandingHeroProps = {
  onHireService: () => void;
  onProvideService: () => void;
};

export default function LandingHero({ onHireService, onProvideService }: LandingHeroProps) {
  return (
    <section className="px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h1 className="mb-6 text-4xl font-bold text-fixly-text md:text-6xl">
            Find Local Service
            <span className="block text-fixly-accent">Professionals</span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-xl text-fixly-text-light">
            Connect with skilled fixers in your area. Post jobs and get them done by verified
            professionals. From electrical work to plumbing, we&apos;ve got you covered.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button
              onClick={onHireService}
              className="btn-primary hover-lift px-8 py-4 text-lg"
            >
              <Search className="mr-2 h-5 w-5" />I Need a Service
            </button>
            <button
              onClick={onProvideService}
              className="btn-secondary hover-lift px-8 py-4 text-lg"
            >
              <Wrench className="mr-2 h-5 w-5" />
              I&apos;m a Service Provider
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
