import type { JobDocument, ObjectIdLike } from '../types';

export function addMilestone(this: JobDocument, title: string, description: string) {
  this.progress.milestones.push({
    title,
    description,
    completed: false,
  });

  return this.save();
}

export function completeMilestone(this: JobDocument, milestoneId: ObjectIdLike) {
  const milestone = this.progress.milestones.id(milestoneId);
  if (!milestone) return false;

  milestone.completed = true;
  milestone.completedAt = new Date();

  return this.save();
}
