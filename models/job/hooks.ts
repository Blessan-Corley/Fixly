import mongoose from 'mongoose';

import type { JobDocument } from './types';

const MAX_APPLICATIONS = 200;
const MAX_COMMENTS = 500;

export function addJobHooks(schema: mongoose.Schema<JobDocument>): void {
  const schemaWithDocumentPost = schema as unknown as {
    post: (event: 'save', fn: (doc: JobDocument) => void) => void;
  };

  schema.pre(
    'save',
    function (this: JobDocument, next: mongoose.CallbackWithoutResultAndOptionalError) {
      try {
        if (this.skillsRequired) {
          this.skillsRequired = this.skillsRequired.map((skill: string) =>
            skill.toLowerCase().trim()
          );
        }

        if (this.featuredUntil && this.featuredUntil < new Date()) {
          this.featured = false;
        }

        if (
          (this.budget.type === 'fixed' || this.budget.type === 'hourly') &&
          (!this.budget.amount || this.budget.amount <= 0)
        ) {
          throw new Error('Budget amount is required for fixed and hourly pricing');
        }

        // Guard unbounded array growth
        if (Array.isArray(this.applications) && this.applications.length > MAX_APPLICATIONS) {
          throw new Error(
            `Job cannot have more than ${MAX_APPLICATIONS} applications`
          );
        }
        if (Array.isArray(this.comments) && this.comments.length > MAX_COMMENTS) {
          throw new Error(`Job cannot have more than ${MAX_COMMENTS} comments`);
        }

        next();
      } catch (error: unknown) {
        next(error instanceof Error ? error : new Error('Unknown Job pre-save validation error'));
      }
    }
  );

  schema.pre(
    'save',
    function (this: JobDocument, next: mongoose.CallbackWithoutResultAndOptionalError) {
      if (this.isModified('status')) {
        this.$locals = this.$locals || {};
        this.$locals.statusChanged = true;
        this.$locals.previousStatus = this._original?.status;
      }
      next();
    }
  );

  schemaWithDocumentPost.post('save', function (doc: JobDocument) {
    if (doc.$locals?.statusChanged) {
      doc.$locals.statusChanged = false;
    }
  });

  // Cascade delete: clean up Reviews, Disputes, and Conversations when a Job is deleted
  schema.pre(
    'deleteOne',
    { document: true, query: false },
    async function (this: JobDocument, next: mongoose.CallbackWithoutResultAndOptionalError) {
      try {
        const jobId = (this as unknown as { _id: unknown })._id;
        const [Review, Dispute, Conversation] = await Promise.all([
          import('../Review').then((m) => m.default),
          import('../Dispute').then((m) => m.default),
          import('../Conversation').then((m) => m.default),
        ]);
        await Promise.all([
          Review.deleteMany({ job: jobId }),
          Dispute.deleteMany({ job: jobId }),
          Conversation.deleteMany({ relatedJob: jobId }),
        ]);
        next();
      } catch (error: unknown) {
        next(error instanceof Error ? error : new Error('Cascade delete failed'));
      }
    }
  );

  schema.pre(
    'findOneAndDelete',
    async function (next: mongoose.CallbackWithoutResultAndOptionalError) {
      try {
        const doc = await this.model.findOne(this.getFilter()).select('_id').lean<{ _id: unknown }>();
        if (doc) {
          const jobId = doc._id;
          const [Review, Dispute, Conversation] = await Promise.all([
            import('../Review').then((m) => m.default),
            import('../Dispute').then((m) => m.default),
            import('../Conversation').then((m) => m.default),
          ]);
          await Promise.all([
            Review.deleteMany({ job: jobId }),
            Dispute.deleteMany({ job: jobId }),
            Conversation.deleteMany({ relatedJob: jobId }),
          ]);
        }
        next();
      } catch (error: unknown) {
        next(error instanceof Error ? error : new Error('Cascade delete failed'));
      }
    }
  );
}
