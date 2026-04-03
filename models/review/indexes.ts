import { ReviewSchema } from './schema';

ReviewSchema.index({ job: 1, reviewer: 1 }, { unique: true });
ReviewSchema.index({ reviewee: 1, rating: -1 });
ReviewSchema.index({ createdAt: -1 });
ReviewSchema.index({ status: 1, isPublic: 1 });
ReviewSchema.index({ 'rating.overall': -1 });
ReviewSchema.index({ job: 1, status: 1, isPublic: 1, createdAt: -1 });
ReviewSchema.index({ reviewee: 1, status: 1, isPublic: 1, createdAt: -1 });
