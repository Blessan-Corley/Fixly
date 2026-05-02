import { AppError } from '@/lib/api/errors';
import PaymentEvent from '@/models/PaymentEvent';
import type { IPaymentEvent } from '@/models/PaymentEvent';

type DuplicateKeyError = Error & { code?: number };

export async function recordPaymentEvent(
  paymentEventId: string,
  paymentEventType: string,
  userId: string,
  rawEvent: object
): Promise<{ isNew: boolean; eventRecord: IPaymentEvent }> {
  try {
    const eventRecord = await PaymentEvent.create({
      paymentEventId,
      paymentEventType,
      userId,
      status: 'pending',
      rawEvent,
    });

    return { isNew: true, eventRecord };
  } catch (error: unknown) {
    const duplicateError = error as DuplicateKeyError;
    if (duplicateError.code === 11000) {
      const existingRecord = await PaymentEvent.findOne({ paymentEventId });
      if (!existingRecord) {
        throw new AppError('INTERNAL_ERROR', 'Duplicate payment event could not be loaded', 500);
      }

      return { isNew: false, eventRecord: existingRecord };
    }

    throw new AppError('INTERNAL_ERROR', 'Failed to record payment event', 500, error);
  }
}

export async function markEventProcessed(paymentEventId: string): Promise<void> {
  await PaymentEvent.updateOne(
    { paymentEventId },
    {
      $set: {
        status: 'processed',
        processedAt: new Date(),
      },
      $unset: {
        failureReason: 1,
        failedAt: 1,
      },
    }
  );
}

export async function markEventFailed(paymentEventId: string, reason: string): Promise<void> {
  await PaymentEvent.updateOne(
    { paymentEventId },
    {
      $set: {
        status: 'failed',
        failedAt: new Date(),
        failureReason: reason,
      },
    }
  );
}

export async function getPaymentHistory(userId: string, limit = 10): Promise<IPaymentEvent[]> {
  return PaymentEvent.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}

export async function findProcessedPaymentEventByOrderId(
  orderId: string
): Promise<IPaymentEvent | null> {
  return PaymentEvent.findOne({
    paymentEventType: 'payment.captured',
    'rawEvent.order_id': orderId,
  }).sort({ createdAt: -1 });
}

export async function findPaymentEventByPaymentId(
  paymentId: string
): Promise<IPaymentEvent | null> {
  return PaymentEvent.findOne({ paymentEventId: paymentId });
}
