'use client';

import { Loader } from 'lucide-react';

export function JobsLoadMore({
  loading,
  onLoadMore,
}: {
  loading: boolean;
  onLoadMore: () => void;
}): React.JSX.Element {
  return (
    <div className="mt-8 text-center">
      <button onClick={onLoadMore} disabled={loading} className="btn-primary">
        {loading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
        Load More Jobs
      </button>
    </div>
  );
}
