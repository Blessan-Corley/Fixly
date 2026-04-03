import { ArrowRight, Building, CheckCircle, Users, Zap } from 'lucide-react';

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Post Your Job',
    description: 'Describe what needs to be fixed with photos and details',
    icon: Building,
  },
  {
    step: 2,
    title: 'Get Quotes',
    description: 'Receive quotes from qualified fixers in your area',
    icon: Users,
  },
  {
    step: 3,
    title: 'Choose & Book',
    description: 'Select the best fixer and schedule the work',
    icon: CheckCircle,
  },
  {
    step: 4,
    title: 'Get It Done',
    description: 'Your job gets completed by a verified professional',
    icon: Zap,
  },
] as const;

export default function LandingHowItWorks() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            How Fixly Works
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-fixly-text-light">
            Getting your job done is simple with our streamlined process
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          {HOW_IT_WORKS.map((step, index) => (
            <div
              key={step.step}
              className="relative text-center transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent text-xl font-bold text-fixly-text">
                {step.step}
              </div>
              <step.icon className="mx-auto mb-4 h-8 w-8 text-fixly-accent" />
              <h3 className="mb-2 text-xl font-semibold text-fixly-text">{step.title}</h3>
              <p className="text-fixly-text-light">{step.description}</p>
              {index < HOW_IT_WORKS.length - 1 && (
                <ArrowRight className="absolute -right-4 top-8 hidden h-6 w-6 text-fixly-accent md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
