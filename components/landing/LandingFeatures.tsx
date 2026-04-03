import { Clock, MapPin, Shield, Star } from 'lucide-react';

const FEATURES = [
  {
    icon: Clock,
    title: 'Quick Response',
    description: 'Get responses from qualified fixers within minutes',
  },
  {
    icon: Shield,
    title: 'Verified Fixers',
    description: 'All fixers are background verified for your safety',
  },
  {
    icon: MapPin,
    title: 'Local Experts',
    description: 'Connect with skilled professionals in your area',
  },
  {
    icon: Star,
    title: 'Quality Assured',
    description: 'Rated and reviewed by customers like you',
  },
] as const;

export default function LandingFeatures() {
  return (
    <section className="bg-fixly-card py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            Why Choose Fixly?
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-fixly-text-light">
            We connect you with the best local service professionals
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl p-6 text-center transition-transform duration-200 hover:-translate-y-1 hover:bg-fixly-bg"
            >
              <feature.icon className="mx-auto mb-4 h-12 w-12 text-fixly-accent" />
              <h3 className="mb-2 text-xl font-semibold text-fixly-text">{feature.title}</h3>
              <p className="text-fixly-text-light">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
