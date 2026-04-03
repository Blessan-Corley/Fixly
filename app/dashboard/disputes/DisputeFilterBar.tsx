'use client';

import { Search } from 'lucide-react';
import type { ChangeEvent } from 'react';

import type { DisputeFilters } from './disputes.types';

type DisputeFilterBarProps = {
  filters: DisputeFilters;
  onFilterChange: <K extends keyof DisputeFilters>(
    key: K,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
};

export default function DisputeFilterBar({ filters, onFilterChange }: DisputeFilterBarProps) {
  return (
    <div className="card mb-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
          <input
            type="text"
            value={filters.search}
            onChange={onFilterChange('search')}
            placeholder="Search disputes..."
            className="input-field pl-10"
          />
        </div>

        <select value={filters.status} onChange={onFilterChange('status')} className="select-field">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="awaiting_response">Awaiting Response</option>
          <option value="in_mediation">In Mediation</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={filters.category}
          onChange={onFilterChange('category')}
          className="select-field"
        >
          <option value="all">All Categories</option>
          <option value="payment_issue">Payment Issue</option>
          <option value="work_quality">Work Quality</option>
          <option value="communication_problem">Communication</option>
          <option value="scope_disagreement">Scope Disagreement</option>
          <option value="timeline_issue">Timeline Issue</option>
          <option value="unprofessional_behavior">Unprofessional Behavior</option>
          <option value="safety_concern">Safety Concern</option>
          <option value="other">Other</option>
        </select>

        <select value={filters.sortBy} onChange={onFilterChange('sortBy')} className="select-field">
          <option value="createdAt">Most Recent</option>
          <option value="status">Status</option>
          <option value="priority">Priority</option>
          <option value="category">Category</option>
        </select>
      </div>
    </div>
  );
}
