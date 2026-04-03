import { onApplicationAccepted, onApplicationRejected } from './onApplicationDecision';
import { onApplicationReceived } from './onApplicationReceived';
import { onDisputeOpened } from './onDisputeOpened';
import { onJobPosted } from './onJobPosted';
import { onBulkNotificationSend, onNotificationSend } from './onNotificationSend';
import { onOrphanUpload } from './onOrphanUpload';
import { onPaymentConfirmed } from './onPaymentConfirmed';
import { onUserSignup } from './onUserSignup';
import { closeInactiveJobs } from './scheduled/closeInactiveJobs';
import { orphanUploadSweep } from './scheduled/orphanUploadSweep';

export const inngestFunctions = [
  onUserSignup,
  onJobPosted,
  onApplicationReceived,
  onApplicationAccepted,
  onApplicationRejected,
  onPaymentConfirmed,
  onDisputeOpened,
  onNotificationSend,
  onBulkNotificationSend,
  onOrphanUpload,
  closeInactiveJobs,
  orphanUploadSweep,
];
