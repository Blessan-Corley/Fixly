import { onApplicationAccepted, onApplicationRejected } from './onApplicationDecision';
import { onApplicationReceived } from './onApplicationReceived';
import { onDisputeOpened } from './onDisputeOpened';
import { onJobPosted } from './onJobPosted';
import { onBulkNotificationSend, onNotificationSend } from './onNotificationSend';
import { onOrphanUpload } from './onOrphanUpload';
import { onPaymentConfirmed } from './onPaymentConfirmed';
import { onPaymentFailed } from './onPaymentFailed';
import { onUserSignup } from './onUserSignup';
import { closeInactiveJobs } from './scheduled/closeInactiveJobs';
import { expireReviews } from './scheduled/expireReviews';
import { orphanUploadSweep } from './scheduled/orphanUploadSweep';

export const inngestFunctions = [
  onUserSignup,
  onJobPosted,
  onApplicationReceived,
  onApplicationAccepted,
  onApplicationRejected,
  onPaymentConfirmed,
  onPaymentFailed,
  onDisputeOpened,
  onNotificationSend,
  onBulkNotificationSend,
  onOrphanUpload,
  closeInactiveJobs,
  expireReviews,
  orphanUploadSweep,
];
