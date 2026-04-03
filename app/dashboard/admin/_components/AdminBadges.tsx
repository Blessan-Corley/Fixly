'use client';

import type { UserRole } from '@/app/dashboard/admin/_lib/admin.types';

export function AdminStatusBadge({
  status,
}: {
  status: 'active' | 'banned' | 'pending';
}): React.JSX.Element {
  const styles = {
    active: 'bg-green-100 text-green-800',
    banned: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function AdminRoleBadge({ role }: { role: UserRole }): React.JSX.Element {
  const styles = {
    hirer: 'bg-blue-100 text-blue-800',
    fixer: 'bg-fixly-accent/20 text-fixly-primary',
    admin: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[role]}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

export function AdminJobStatusBadge({ status }: { status: string }): React.JSX.Element {
  const className =
    status === 'open'
      ? 'bg-green-100 text-green-800'
      : status === 'in_progress'
        ? 'bg-blue-100 text-blue-800'
        : status === 'completed'
          ? 'bg-gray-100 text-gray-800'
          : 'bg-yellow-100 text-yellow-800';

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      {status.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
    </span>
  );
}
