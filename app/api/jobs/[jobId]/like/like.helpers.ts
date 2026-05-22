import { z } from 'zod';

export type ToggleLikeResult = {
  liked?: boolean;
  likeCount?: number;
};

export type JobWithLikeActions = {
  createdBy?: unknown;
  title?: string;
  toggleLike: (userId: unknown) => ToggleLikeResult;
  save: () => Promise<unknown>;
};

export type JobLikeEntry = {
  user?: unknown;
};

export type JobLikesProjection = {
  likes?: JobLikeEntry[];
};

export const JobLikeParamsSchema = z.object({
  jobId: z.string().min(1),
});

export function toIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
}
