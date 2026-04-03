import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import HowItWorksCta from './HowItWorksCta';
import HowItWorksHeader from './HowItWorksHeader';
import HowItWorksHero from './HowItWorksHero';
import HowItWorksSafety from './HowItWorksSafety';
import HowItWorksStepSection from './HowItWorksStepSection';

export default function HowItWorksPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-fixly-bg">
      <HowItWorksHeader />

      <HowItWorksHero />

      <HowItWorksStepSection
        variant="customer"
        title="For Customers"
        subtitle="Get your jobs done by verified professionals in 4 simple steps"
        ctaHref="/auth/signup?role=hirer"
        ctaLabel="Post Your First Job"
        cardBg="bg-fixly-card"
        ctaClassName="btn-primary"
      />

      <HowItWorksStepSection
        variant="fixer"
        title="For Service Providers"
        subtitle="Build your business and find customers in 4 simple steps"
        ctaHref="/auth/signup?role=fixer"
        ctaLabel="Become a Service Provider"
        cardBg="bg-fixly-bg"
        sectionClassName="bg-fixly-card"
        ctaClassName="btn-secondary"
      />

      <HowItWorksSafety />

      <HowItWorksCta />

      <div className="fixed bottom-6 left-6">
        <Link
          href="/"
          className="hover-lift rounded-full border border-fixly-border bg-fixly-card p-3 shadow-fixly transition-all duration-200 hover:bg-fixly-card/80"
        >
          <ArrowLeft className="h-5 w-5 text-fixly-text" />
        </Link>
      </div>
    </div>
  );
}
