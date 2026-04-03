import { Inngest } from 'inngest';

export type Events = {
  'user/signup.completed': {
    data: {
      userId: string;
      email: string;
      name: string;
      role: 'hirer' | 'fixer';
    };
  };
  'user/profile.verified': {
    data: {
      userId: string;
      email: string;
      name: string;
    };
  };
  'user/account.suspended': {
    data: {
      userId: string;
      email: string;
      reason: string;
    };
  };
  'job/posted': {
    data: {
      jobId: string;
      hirerId: string;
      hirerEmail: string;
      hirerName: string;
      title: string;
      category: string;
      location: string;
      draftId?: string;
    };
  };
  'job/application.received': {
    data: {
      jobId: string;
      jobTitle: string;
      hirerId: string;
      hirerEmail: string;
      hirerName: string;
      fixerId: string;
      fixerName: string;
      applicationId: string;
    };
  };
  'job/application.accepted': {
    data: {
      jobId: string;
      jobTitle: string;
      fixerId: string;
      fixerEmail: string;
      fixerName: string;
      hirerId: string;
      hirerName: string;
      rejectedApplicants?: Array<{
        fixerId: string;
        jobTitle: string;
      }>;
    };
  };
  'job/application.rejected': {
    data: {
      jobId: string;
      jobTitle: string;
      fixerId: string;
      fixerEmail: string;
      fixerName: string;
    };
  };
  'job/completed': {
    data: {
      jobId: string;
      jobTitle: string;
      hirerId: string;
      hirerEmail: string;
      hirerName: string;
      fixerId: string;
      fixerEmail: string;
      fixerName: string;
    };
  };
  'order/payment.confirmed': {
    data: {
      orderId: string;
      userId: string;
      userEmail: string;
      userName: string;
      amount: number;
      currency: string;
      jobId?: string;
      jobTitle?: string;
    };
  };
  'stripe/checkout.completed': {
    data: {
      orderId: string;
      userId: string;
      userEmail: string;
      userName: string;
      amount: number;
      currency: string;
      planId: string;
      periodEnd?: string;
    };
  };
  'order/payment.failed': {
    data: {
      userId: string;
      userEmail: string;
      amount: number;
      reason: string;
    };
  };
  'order/refund.issued': {
    data: {
      userId: string;
      userEmail: string;
      amount: number;
      jobId?: string;
    };
  };
  'notification/send': {
    data: {
      userId: string;
      type: string;
      title: string;
      message: string;
      link?: string;
      metadata?: Record<string, unknown>;
    };
  };
  'notification/send.bulk': {
    data: {
      notifications: Array<{
        userId: string;
        type: string;
        title: string;
        message: string;
        link?: string;
        metadata?: Record<string, unknown>;
      }>;
    };
  };
  'dispute/opened': {
    data: {
      disputeId: string;
      jobId: string;
      jobTitle: string;
      openedByUserId: string;
      hirerId: string;
      hirerEmail: string;
      hirerName: string;
      fixerId: string;
      fixerEmail: string;
      fixerName: string;
      reason: string;
    };
  };
  'upload/orphan.cleanup': {
    data: { publicIds: string[]; reason: string; uploadedAt: string };
  };
  'scheduled/orphan.sweep': {
    data: Record<string, never>;
  };
  'scheduled/inactive.jobs.close': {
    data: Record<string, never>;
  };
};

export const inngest = new Inngest({
  id: 'fixly',
});
