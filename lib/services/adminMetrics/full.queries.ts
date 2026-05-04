import type { FilterQuery } from 'mongoose';

import Dispute from '@/models/Dispute';
import Job from '@/models/Job';
import Review from '@/models/Review';
import User from '@/models/User';

import type { CountResult, DisputeAverageAggregate, DisputedJobAggregate, UserPlanAggregate } from './types';

export function buildUserQueries(today: Date, week: Date, month: Date) {
  return [
    User.countDocuments({ role: { $ne: 'admin' } }),
    User.countDocuments({ role: 'hirer' }),
    User.countDocuments({ role: 'fixer' }),
    User.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: week } }),
    User.countDocuments({ createdAt: { $gte: month } }),
    User.countDocuments({
      $or: [{ lastActivityAt: { $gte: today } }, { lastLoginAt: { $gte: today } }],
    }),
    User.countDocuments({ banned: true }),
  ] as const;
}

export function buildJobQueries(today: Date, week: Date) {
  return [
    Job.countDocuments({}),
    Job.countDocuments({ status: { $in: ['open', 'in_progress', 'in-progress'] } }),
    Job.countDocuments({ status: 'completed' }),
    Job.countDocuments({ status: 'cancelled' }),
    Dispute.aggregate<DisputedJobAggregate>([
      { $match: { isActive: true } },
      { $group: { _id: '$job' } },
      { $count: 'count' },
    ]),
    Job.countDocuments({ createdAt: { $gte: today } }),
    Job.countDocuments({ createdAt: { $gte: week } }),
  ] as const;
}

export function buildApplicationQueries(week: Date) {
  return [
    Job.aggregate<CountResult>([{ $unwind: '$applications' }, { $count: 'count' }]),
    Job.aggregate<CountResult>([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'pending' } },
      { $count: 'count' },
    ]),
    Job.aggregate<CountResult>([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'accepted' } },
      { $count: 'count' },
    ]),
    Job.aggregate<CountResult>([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'rejected' } },
      { $count: 'count' },
    ]),
    Job.aggregate<CountResult>([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'withdrawn', 'applications.reviewedAt': { $gte: week } } },
      { $count: 'count' },
    ]),
  ] as const;
}

export function buildReviewQueries() {
  return [
    Review.countDocuments({}),
    Review.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, average: { $avg: '$rating.overall' } } },
    ]),
    Review.countDocuments({ reportedBy: { $exists: true, $not: { $size: 0 } } }),
  ] as const;
}

export function buildDisputeQueries() {
  return [
    Dispute.countDocuments({}),
    Dispute.countDocuments({
      status: { $in: ['pending', 'under_review', 'awaiting_response', 'in_mediation'] },
      isActive: true,
    }),
    Dispute.countDocuments({ status: 'resolved' }),
    Dispute.countDocuments({ status: 'escalated' }),
    Dispute.aggregate<DisputeAverageAggregate>([
      {
        $match: {
          status: 'resolved',
          createdAt: { $exists: true },
          'resolution.implementedAt': { $exists: true },
        },
      },
      { $project: { resolutionMs: { $subtract: ['$resolution.implementedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$resolutionMs' } } },
    ]),
  ] as const;
}

export function buildRevenueQuery() {
  return User.aggregate<UserPlanAggregate>([
    { $match: { 'plan.status': 'active' } satisfies FilterQuery<unknown> },
    {
      $group: {
        _id: { role: '$role', type: '$plan.type' },
        count: { $sum: 1 },
        totalAmount: { $sum: { $ifNull: ['$plan.amount', 0] } },
      },
    },
  ]);
}
