import { Eye, Search, Users } from 'lucide-react';

export function SearchWelcomeState(): React.JSX.Element {
  return (
    <div className="py-12 text-center">
      <Search className="mx-auto mb-6 h-16 w-16 text-fixly-accent" />
      <h1 className="mb-4 text-3xl font-bold text-fixly-text">Find Your Next Job</h1>
      <p className="mx-auto mb-8 max-w-2xl text-lg text-fixly-text-light">
        Search through thousands of jobs posted by verified clients. Use the search bar above to
        find jobs that match your skills and location.
      </p>
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent-light p-4">
            <Search className="h-8 w-8 text-fixly-accent" />
          </div>
          <h3 className="mb-2 font-semibold text-fixly-text">Search & Filter</h3>
          <p className="text-sm text-fixly-text-light">
            Use advanced filters to find jobs that match your skills and preferences
          </p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent-light p-4">
            <Eye className="h-8 w-8 text-fixly-accent" />
          </div>
          <h3 className="mb-2 font-semibold text-fixly-text">Browse Details</h3>
          <p className="text-sm text-fixly-text-light">
            View detailed job descriptions, requirements, and client information
          </p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent-light p-4">
            <Users className="h-8 w-8 text-fixly-accent" />
          </div>
          <h3 className="mb-2 font-semibold text-fixly-text">Apply Easily</h3>
          <p className="text-sm text-fixly-text-light">
            Submit your application with a personalized message and proposal
          </p>
        </div>
      </div>
    </div>
  );
}
