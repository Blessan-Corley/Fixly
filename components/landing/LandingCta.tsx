'use client';

type LandingCtaProps = {
  onPostJob: () => void;
  onBecomeFixer: () => void;
};

export default function LandingCta({ onPostJob, onBecomeFixer }: LandingCtaProps) {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <div className="rounded-2xl bg-fixly-card p-12 shadow-fixly-lg transition-transform duration-300 hover:-translate-y-1">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mb-8 text-xl text-fixly-text-light">
            Join thousands of satisfied customers and service providers on Fixly
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button onClick={onPostJob} className="btn-primary hover-lift px-8 py-4 text-lg">
              Post a Job
            </button>
            <button
              onClick={onBecomeFixer}
              className="btn-secondary hover-lift px-8 py-4 text-lg"
            >
              Become a Fixer
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
