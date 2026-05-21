import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Ananya S.',
    location: 'Bengaluru',
    role: 'Hirer',
    rating: 5,
    text: "Found a plumber within the hour. He showed up on time, fixed the leak, and the whole thing cost less than I expected. No haggling, no guesswork.",
  },
  {
    name: 'Mohan R.',
    location: 'Mumbai',
    role: 'Fixer',
    rating: 5,
    text: "I was freelancing but struggling to find steady work. Fixly sends me 3–5 new job leads every week. My income has more than doubled since I joined.",
  },
  {
    name: 'Deepa K.',
    location: 'Chennai',
    role: 'Hirer',
    rating: 5,
    text: "The in-app chat made coordinating with the electrician so easy. No exchanging numbers, no WhatsApp chaos — everything in one place.",
  },
] as const;

function StarRow({ count }: { count: number }) {
  return (
    <div className="mb-3 flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-fixly-accent text-fixly-accent" aria-hidden="true" />
      ))}
    </div>
  );
}

export default function LandingTestimonials() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            Real People, Real Results
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-fixly-text-light">
            Hirers get reliable help. Fixers get steady work. That&apos;s the deal.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-fixly-border bg-fixly-card p-6"
            >
              <StarRow count={t.rating} />
              <blockquote className="mb-6 flex-1 text-fixly-text-light">
                &ldquo;{t.text}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fixly-accent/20 text-sm font-bold text-fixly-accent">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-fixly-text">{t.name}</p>
                  <p className="text-xs text-fixly-text-muted">
                    {t.role} · {t.location}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
