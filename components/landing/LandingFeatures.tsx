import { BadgeCheck, Clock3, MessageSquare, ShieldCheck } from 'lucide-react';

const FEATURES = [
  {
    icon: Clock3,
    title: 'Fast Quotes',
    description:
      'Post a job and receive competitive quotes from nearby fixers — usually within the hour.',
  },
  {
    icon: BadgeCheck,
    title: 'ID-Verified Fixers',
    description:
      'Every fixer on Fixly has passed identity verification before their first job. No anonymous strangers.',
  },
  {
    icon: MessageSquare,
    title: 'Built-In Messaging',
    description:
      'Coordinate details, share photos, and track progress without leaving the app — no WhatsApp handoff needed.',
  },
  {
    icon: ShieldCheck,
    title: 'Dispute Protection',
    description:
      "If something goes wrong, our dispute process steps in so you're never left dealing with it alone.",
  },
] as const;

export default function LandingFeatures() {
  return (
    <section className="bg-fixly-card py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">Why Fixly?</h2>
          <p className="mx-auto max-w-2xl text-xl text-fixly-text-light">
            Hiring local help used to mean asking friends or trusting strangers. Fixly changes that.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl p-6 text-center transition-transform duration-200 hover:-translate-y-1 hover:bg-fixly-bg"
            >
              <feature.icon
                className="mx-auto mb-4 h-12 w-12 text-fixly-accent"
                aria-hidden="true"
              />
              <h3 className="mb-2 text-xl font-semibold text-fixly-text">{feature.title}</h3>
              <p className="text-fixly-text-light">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
