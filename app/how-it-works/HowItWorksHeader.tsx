import { Wrench } from 'lucide-react';
import Link from 'next/link';

export default function HowItWorksHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-50 border-b border-fixly-border bg-fixly-card/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <Wrench className="mr-2 h-8 w-8 text-fixly-accent" />
            <span className="text-2xl font-bold text-fixly-text">Fixly</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/auth/signin" className="btn-ghost">
              Sign In
            </Link>
            <Link href="/auth/signup?role=hirer" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
