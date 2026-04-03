import mongoose, { type Model } from 'mongoose';

type ObjectIdLike = mongoose.Types.ObjectId | string;

export interface JobViewDocument extends mongoose.Document {
  job: ObjectIdLike;
  user: ObjectIdLike;
  viewedOn: string;
  viewedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

type JobViewModel = Model<JobViewDocument>;

const jobViewSchema = new mongoose.Schema<JobViewDocument>(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    viewedOn: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Invalid viewedOn date key'],
    },
    viewedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    ipAddress: {
      type: String,
      maxlength: 128,
    },
    userAgent: {
      type: String,
      maxlength: 512,
    },
  },
  {
    timestamps: false,
  }
);

jobViewSchema.index({ job: 1, user: 1, viewedOn: 1 }, { unique: true });
jobViewSchema.index({ job: 1, viewedOn: 1, viewedAt: -1 });
jobViewSchema.index({ user: 1, viewedAt: -1 });

export default (mongoose.models.JobView as JobViewModel) ||
  mongoose.model<JobViewDocument, JobViewModel>('JobView', jobViewSchema);
