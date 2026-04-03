import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type PaymentEventStatus = 'pending' | 'processed' | 'failed';

export interface IPaymentEvent extends Document {
  _id: Types.ObjectId;
  stripeEventId: string;
  stripeEventType: string;
  userId: Types.ObjectId;
  status: PaymentEventStatus;
  processedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  rawEvent?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

type PaymentEventModel = Model<IPaymentEvent>;

const paymentEventSchema = new Schema<IPaymentEvent, PaymentEventModel>(
  {
    stripeEventId: {
      type: String,
      required: true,
      trim: true,
    },
    stripeEventType: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
    },
    processedAt: Date,
    failedAt: Date,
    failureReason: String,
    rawEvent: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

paymentEventSchema.index({ stripeEventId: 1 }, { unique: true });
paymentEventSchema.index({ userId: 1, createdAt: -1 });
paymentEventSchema.index({ status: 1, createdAt: -1 });

const PaymentEvent =
  (mongoose.models.PaymentEvent as PaymentEventModel | undefined) ??
  mongoose.model<IPaymentEvent, PaymentEventModel>('PaymentEvent', paymentEventSchema);

export default PaymentEvent;
