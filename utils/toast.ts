import { toast } from 'sonner';

export const toastMessages = {
  job: {
    applied: () =>
      toast.success('Application submitted successfully!', {
        description: 'Your application is now under review',
      }),
    applicationFailed: (message?: string) =>
      toast.error('Application failed', {
        description: message || 'Please try again or contact support',
      }),
    posted: () =>
      toast.success('Job posted successfully!', {
        description: 'Your job is now visible to skilled fixers',
      }),
    updated: () =>
      toast.success('Job updated', {
        description: 'Changes have been saved successfully',
      }),
    deleted: () =>
      toast.success('Job deleted', {
        description: 'The job has been removed from listings',
      }),
    expired: () =>
      toast.info('Job has expired', {
        description: 'Consider reposting to get more applications',
      }),
  },
  application: {
    accepted: (jobTitle: string) =>
      toast.success('Application accepted!', {
        description: `You can now start working on "${jobTitle}"`,
      }),
    rejected: (jobTitle: string) =>
      toast.info('Application not selected', {
        description: `The client chose another applicant for "${jobTitle}"`,
      }),
    withdrawn: () =>
      toast.info('Application withdrawn', {
        description: 'You can apply to other similar jobs',
      }),
  },
  message: {
    sent: () =>
      toast.success('Message sent', {
        description: 'Your message has been delivered',
      }),
    failed: () =>
      toast.error('Message failed to send', {
        description: 'Please check your connection and try again',
      }),
    newMessage: (senderName: string) =>
      toast.info(`New message from ${senderName}`, {
        description: 'Click to view conversation',
      }),
  },
  profile: {
    updated: () =>
      toast.success('Profile updated', {
        description: 'Your changes have been saved',
      }),
    photoUpdated: () =>
      toast.success('Profile photo updated', {
        description: 'Your new photo is now visible',
      }),
    phoneUpdated: () =>
      toast.success('Phone number updated', {
        description: 'Please verify your new number',
      }),
    usernameChanged: (newUsername: string) =>
      toast.success('Username changed', {
        description: `You are now @${newUsername}`,
      }),
  },
  auth: {
    signedIn: () =>
      toast.success('Welcome back!', {
        description: 'You have successfully signed in',
      }),
    signedOut: () =>
      toast.success('Signed out', {
        description: 'You have been logged out safely',
      }),
    verificationSent: () =>
      toast.success('Verification sent', {
        description: 'Check your email or phone for the code',
      }),
    verified: () =>
      toast.success('Account verified!', {
        description: 'You can now access all features',
      }),
  },
  payment: {
    successful: () =>
      toast.success('Payment successful!', {
        description: 'Your Pro subscription is now active',
      }),
    failed: () =>
      toast.error('Payment failed', {
        description: 'Please try again or use a different payment method',
      }),
    refunded: () =>
      toast.info('Refund processed', {
        description: 'Amount will appear in your account within 3-5 days',
      }),
  },
  system: {
    connectionLost: () =>
      toast.error('Connection lost', {
        description: 'Trying to reconnect...',
        duration: 5000,
      }),
    connectionRestored: () =>
      toast.success('Connection restored', {
        description: 'You are back online',
      }),
    maintenanceMode: () =>
      toast.warning('Scheduled maintenance', {
        description: 'Some features may be temporarily unavailable',
      }),
    featureUnavailable: () =>
      toast.info('Feature coming soon', {
        description: 'This feature is being developed',
      }),
  },
  error: {
    generic: () =>
      toast.error('Something went wrong', {
        description: 'Please try again or contact support if the issue persists',
      }),
    network: () =>
      toast.error('Network error', {
        description: 'Please check your internet connection',
      }),
    unauthorized: () =>
      toast.error('Access denied', {
        description: 'You need to sign in to perform this action',
      }),
    rateLimit: () =>
      toast.error('Too many requests', {
        description: 'Please wait a moment before trying again',
      }),
  },
  success: {
    saved: () =>
      toast.success('Changes saved', {
        description: 'Your updates have been applied',
      }),
    copied: () =>
      toast.success('Copied to clipboard', {
        description: 'You can now paste it anywhere',
      }),
    shared: () =>
      toast.success('Link shared', {
        description: 'Others can now access this content',
      }),
  },
} as const;

export const showToast = {
  success: (message: string, description?: string) => toast.success(message, { description }),
  error: (message: string, description?: string) => toast.error(message, { description }),
  info: (message: string, description?: string) => toast.info(message, { description }),
  warning: (message: string, description?: string) => toast.warning(message, { description }),
  loading: (message: string) => toast.loading(message),
  promise: <T>(promise: Promise<T>, messages: Parameters<typeof toast.promise>[1]) =>
    toast.promise(promise, messages),
};

export const contextToast = (context: string, action: string, data: unknown = {}) => {
  const contextMessages = toastMessages[context as keyof typeof toastMessages];
  const actionHandler = contextMessages?.[action as keyof typeof contextMessages] as
    | ((payload?: unknown) => string | number)
    | undefined;

  if (typeof actionHandler === 'function') {
    return actionHandler(data);
  }

  return toastMessages.error.generic();
};

export default toastMessages;
