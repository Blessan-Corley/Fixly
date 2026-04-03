'use client';

import { Ban, Eye, Search, UserCheck } from 'lucide-react';
import Image from 'next/image';

import {
  AdminRoleBadge,
  AdminStatusBadge,
} from '@/app/dashboard/admin/_components/AdminBadges';
import { formatDate } from '@/app/dashboard/admin/_lib/admin.helpers';
import type { AdminUser, UserAction, UserFilter } from '@/app/dashboard/admin/_lib/admin.types';

type AdminUsersTabProps = {
  searchTerm: string;
  userFilter: UserFilter;
  users: AdminUser[];
  onSearchTermChange: (value: string) => void;
  onUserFilterChange: (value: UserFilter) => void;
  onUserAction: (userId: string, action: UserAction) => void;
};

export function AdminUsersTab({
  searchTerm,
  userFilter,
  users,
  onSearchTermChange,
  onUserFilterChange,
  onUserAction,
}: AdminUsersTabProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-fixly-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder="Search users..."
              className="input-field pl-10"
            />
          </div>
        </div>
        <select
          value={userFilter}
          onChange={(e) => onUserFilterChange(e.target.value as UserFilter)}
          className="select-field w-full sm:w-48"
        >
          <option value="all">All Users</option>
          <option value="hirer">Hirers</option>
          <option value="fixer">Fixers</option>
          <option value="admin">Admins</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-fixly-border">
              <th className="px-4 py-3 text-left font-medium text-fixly-text">User</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Role</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Status</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Joined</th>
              <th className="px-4 py-3 text-left font-medium text-fixly-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-b border-fixly-border hover:bg-fixly-bg">
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <Image
                      src={user.profilePhoto || '/default-avatar.png'}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="mr-3 h-8 w-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-fixly-text">{user.name}</div>
                      <div className="text-sm text-fixly-text-muted">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <AdminRoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3">
                  <AdminStatusBadge status={user.banned ? 'banned' : 'active'} />
                </td>
                <td className="px-4 py-3 text-sm text-fixly-text-muted">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUserAction(user._id, 'view')}
                      className="rounded p-1 hover:bg-fixly-accent/10"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4 text-fixly-text-muted" />
                    </button>
                    {!user.banned ? (
                      <button
                        onClick={() => onUserAction(user._id, 'ban')}
                        className="rounded p-1 hover:bg-red-50"
                        title="Ban User"
                      >
                        <Ban className="h-4 w-4 text-red-600" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onUserAction(user._id, 'unban')}
                        className="rounded p-1 hover:bg-green-50"
                        title="Unban User"
                      >
                        <UserCheck className="h-4 w-4 text-green-600" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-fixly-text-muted">
                  No users match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
