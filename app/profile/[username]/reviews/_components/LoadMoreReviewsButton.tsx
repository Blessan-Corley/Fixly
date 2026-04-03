import { Loader, TrendingUp } from 'lucide-react';

type LoadMoreReviewsButtonProps = {
  loadingMore: boolean;
  onClick: () => void;
};

export function LoadMoreReviewsButton({
  loadingMore,
  onClick,
}: LoadMoreReviewsButtonProps): React.JSX.Element {
  return (
    <div className="mt-8 text-center">
      <button
        type="button"
        onClick={onClick}
        disabled={loadingMore}
        className="btn-secondary mx-auto flex items-center"
      >
        {loadingMore ? (
          <Loader className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <TrendingUp className="mr-2 h-5 w-5" />
        )}
        {loadingMore ? 'Loading...' : 'Load More Reviews'}
      </button>
    </div>
  );
}
