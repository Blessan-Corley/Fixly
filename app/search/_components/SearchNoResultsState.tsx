import { Search } from 'lucide-react';

type SearchNoResultsStateProps = {
  onClearFilters: () => void;
  onBrowseAllJobs: () => void;
};

export function SearchNoResultsState({
  onClearFilters,
  onBrowseAllJobs,
}: SearchNoResultsStateProps): React.JSX.Element {
  return (
    <div className="py-12 text-center">
      <Search className="mx-auto mb-4 h-12 w-12 text-fixly-text-light" />
      <h2 className="mb-2 text-xl font-bold text-fixly-text">No jobs found</h2>
      <p className="mb-6 text-fixly-text-light">
        Try adjusting your search criteria or browse all jobs
      </p>
      <div className="space-x-4">
        <button type="button" onClick={onClearFilters} className="btn-ghost">
          Clear Filters
        </button>
        <button type="button" onClick={onBrowseAllJobs} className="btn-primary">
          Browse All Jobs
        </button>
      </div>
    </div>
  );
}
