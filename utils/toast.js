// utils/toast.js
import { toast } from 'sonner';

// Professional toast messages for different actions
export const toastMessages = {
  // Job-related toasts
  job: {
    applied: () => toast.success('Application submitted successfully! 🎯', {
      description: 'Your application is now under review'
    }),
    applicationFailed: (message) => toast.error('Application failed', {
      description: message || 'Please try again or contact support'
    }),
    posted: () => toast.success('Job posted successfully! 📢', {
      description: 'Your job is now visible to skilled fixers'
    }),
    updated: () => toast.success('Job updated', {
      description: 'Changes have been saved successfully'
    }),
    deleted: () => toast.success('Job deleted', {
      description: 'The job has been removed from listings'
    }),
    expired: () => toast.info('Job has expired', {
      description: 'Consider reposting to get more applications'
    })
  },

  // Application-related toasts
  application: {
    accepted: (jobTitle) => toast.success('Application accepted! 🎉', {
      description: `You can now start working on "${jobTitle}"`
    }),
    rejected: (jobTitle) => toast.info('Application not selected', {
      description: `The client chose another applicant for "${jobTitle}"`
    }),
    withdrawn: () => toast.info('Application withdrawn', {
      description: 'You can apply to other similar jobs'
    })
  },

  // Message-related toasts
  message: {
    sent: () => toast.success('Message sent', {
      description: 'Your message has been delivered'
    }),
    failed: () => toast.error('Message failed to send', {
      description: 'Please check your connection and try again'
    }),
    newMessage: (senderName) => toast.info(`New message from ${senderName}`, {
      description: 'Click to view conversation'
    })
  },

  // Profile & Settings toasts
  profile: {
    updated: () => toast.success('Profile updated', {
      description: 'Your changes have been saved'
    }),
    photoUpdated: () => toast.success('Profile photo updated', {
      description: 'Your new photo is now visible'
    }),
    phoneUpdated: () => toast.success('Phone number updated', {
      description: 'Please verify your new number'
    }),
    usernameChanged: (newUsername) => toast.success('Username changed', {
      description: `You are now @${newUsername}`
    })
  },

  // Authentication toasts
  auth: {
    signedIn: () => toast.success('Welcome back! 👋', {
      description: 'You have successfully signed in'
    }),
    signedOut: () => toast.success('Signed out', {
      description: 'You have been logged out safely'
    }),
    verificationSent: () => toast.success('Verification sent', {
      description: 'Check your email or phone for the code'
    }),
    verified: () => toast.success('Account verified! ✅', {
      description: 'You can now access all features'
    })
  },

  // Payment & Subscription toasts
  payment: {
    successful: () => toast.success('Payment successful! 💳', {
      description: 'Your Pro subscription is now active'
    }),
    failed: () => toast.error('Payment failed', {
      description: 'Please try again or use a different payment method'
    }),
    refunded: () => toast.info('Refund processed', {
      description: 'Amount will appear in your account within 3-5 days'
    })
  },

  // System toasts
  system: {
    connectionLost: () => toast.error('Connection lost', {
      description: 'Trying to reconnect...',
      duration: 5000
    }),
    connectionRestored: () => toast.success('Connection restored', {
      description: 'You are back online'
    }),
    maintenanceMode: () => toast.warning('Scheduled maintenance', {
      description: 'Some features may be temporarily unavailable'
    }),
    featureUnavailable: () => toast.info('Feature coming soon', {
      description: 'This feature is being developed'
    })
  },

  // Error toasts
  error: {
    generic: () => toast.error('Something went wrong', {
      description: 'Please try again or contact support if the issue persists'
    }),
    network: () => toast.error('Network error', {
      description: 'Please check your internet connection'
    }),
    unauthorized: () => toast.error('Access denied', {
      description: 'You need to sign in to perform this action'
    }),
    rateLimit: () => toast.error('Too many requests', {
      description: 'Please wait a moment before trying again'
    })
  },

  // Success toasts
  success: {
    saved: () => toast.success('Changes saved', {
      description: 'Your updates have been applied'
    }),
    copied: () => toast.success('Copied to clipboard', {
      description: 'You can now paste it anywhere'
    }),
    shared: () => toast.success('Link shared', {
      description: 'Others can now access this content'
    })
  }
};

// Quick access functions
export const showToast = {
  success: (message, description) => toast.success(message, { description }),
  error: (message, description) => toast.error(message, { description }),
  info: (message, description) => toast.info(message, { description }),
  warning: (message, description) => toast.warning(message, { description }),
  loading: (message) => toast.loading(message),
  promise: (promise, messages) => toast.promise(promise, messages)
};

// Context-aware toast helper
export const contextToast = (context, action, data = {}) => {
  const contextMessages = toastMessages[context];
  if (contextMessages && contextMessages[action]) {
    return contextMessages[action](data);
  }
  return toastMessages.error.generic();
};

export default toastMessages;