import { CheckCircle, MapPin, Star, Users } from 'lucide-react';

const STATS = [
  { label: 'Active Fixers', value: '10,000+', icon: Users },
  { label: 'Jobs Completed', value: '50,000+', icon: CheckCircle },
  { label: 'Cities Covered', value: '500+', icon: MapPin },
  { label: 'Average Rating', value: '4.8★', icon: Star },
] as const;

export default function LandingStats() {
  return (
    <section className="bg-fixly-card py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="text-center transition-transform duration-300 hover:-translate-y-1"
            >
              <stat.icon className="mx-auto mb-2 h-8 w-8 text-fixly-accent" />
              <div className="mb-1 text-3xl font-bold text-fixly-text">{stat.value}</div>
              <div className="text-fixly-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
