import type mongoose from 'mongoose';

export function addJobIndexes(schema: mongoose.Schema): void {
  // User-specific queries
  schema.index({ createdBy: 1, status: 1 });
  schema.index({ assignedTo: 1, status: 1 });
  schema.index({ createdBy: 1, createdAt: -1 });
  schema.index({ assignedTo: 1, createdAt: -1 });
  // Compound index replaces the former separate { 'applications.fixer': 1 } and
  // { 'applications.status': 1 } — covers both fixer lookup and status-filtered queries
  schema.index({ 'applications.fixer': 1, 'applications.status': 1 });
  schema.index({ 'likes.user': 1 });

  // Location-based queries
  schema.index({ 'location.city': 1, status: 1 });
  schema.index({ 'location.state': 1, status: 1 });
  schema.index({ 'location.city': 1, skillsRequired: 1, status: 1 });

  // Status and filter queries
  schema.index({ status: 1, createdAt: -1 });
  schema.index({ deadline: 1, status: 1 });
  schema.index({ urgency: 1, status: 1 });
  schema.index({ skillsRequired: 1, status: 1 });
  schema.index({ experienceLevel: 1, status: 1 });
  schema.index({ type: 1, status: 1 });
  // { 'budget.amount': 1, status: 1 } removed — covered as prefix of the 3-field compound below
  schema.index({ 'budget.type': 1, status: 1 });
  schema.index({ 'budget.amount': 1, 'budget.type': 1, status: 1 });
  schema.index({ 'dispute.raised': 1, status: 1 });
  schema.index({ 'cancellation.cancelled': 1 });
  schema.index({ 'progress.startedAt': 1, status: 1 });

  // Performance optimization indexes
  schema.index({ featured: 1, featuredUntil: 1 });
  schema.index({ status: 1, featured: 1, createdAt: -1 });
  // { 'completion.rating': -1 } removed — no queries filter/sort on completion rating alone
  schema.index({ 'views.count': -1, status: 1 });
  schema.index({ title: 'text', description: 'text', skillsRequired: 'text' });
}
