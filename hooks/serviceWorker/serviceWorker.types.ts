export type PendingRequest = {
  id?: string | number;
  [key: string]: unknown;
};

export type PendingSync = {
  tag: string;
  data: unknown;
  timestamp: number;
};

export type SyncCapableRegistration = ServiceWorkerRegistration & {
  sync: {
    register: (tag: string) => Promise<void>;
  };
};

export type SWMessagePayload = {
  type?: string;
  payload?: unknown;
};

export type BeforeInstallPromptChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
};

export type ShareDataInput = {
  title?: string;
  text?: string;
  url?: string;
};

export const SERVICE_WORKER_SYNC_TAGS = {
  analytics: 'analytics-queue',
  notifications: 'notification-read-queue',
  drafts: 'draft-save-queue',
} as const;
