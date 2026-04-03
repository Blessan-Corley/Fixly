import { User } from 'lucide-react';

export function ReviewsUserNotFoundState(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <User className="mx-auto mb-4 h-12 w-12 text-fixly-text-light" />
        <h1 className="text-xl font-semibold text-fixly-text">User not found</h1>
      </div>
    </div>
  );
}
