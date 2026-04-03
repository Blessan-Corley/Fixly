import { beforeEach, describe, expect, it, vi } from 'vitest';

// sonner is mocked globally in tests/setup.ts
import { toast } from 'sonner';

import { contextToast, showToast, toastMessages } from '@/utils/toast';

const mockToast = vi.mocked(toast);

describe('toast utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toastMessages', () => {
    describe('job', () => {
      it('calls toast.success for applied', () => {
        toastMessages.job.applied();
        expect(mockToast.success).toHaveBeenCalledWith(
          'Application submitted successfully!',
          expect.objectContaining({ description: 'Your application is now under review' })
        );
      });

      it('calls toast.error for applicationFailed with default message', () => {
        toastMessages.job.applicationFailed();
        expect(mockToast.error).toHaveBeenCalledWith(
          'Application failed',
          expect.objectContaining({ description: 'Please try again or contact support' })
        );
      });

      it('calls toast.error for applicationFailed with custom message', () => {
        toastMessages.job.applicationFailed('Custom error message');
        expect(mockToast.error).toHaveBeenCalledWith(
          'Application failed',
          expect.objectContaining({ description: 'Custom error message' })
        );
      });

      it('calls toast.success for posted', () => {
        toastMessages.job.posted();
        expect(mockToast.success).toHaveBeenCalledWith(
          'Job posted successfully!',
          expect.objectContaining({ description: 'Your job is now visible to skilled fixers' })
        );
      });

      it('calls toast.success for updated', () => {
        toastMessages.job.updated();
        expect(mockToast.success).toHaveBeenCalledWith('Job updated', expect.any(Object));
      });

      it('calls toast.success for deleted', () => {
        toastMessages.job.deleted();
        expect(mockToast.success).toHaveBeenCalledWith('Job deleted', expect.any(Object));
      });

      it('calls toast.info for expired', () => {
        toastMessages.job.expired();
        expect(mockToast.info).toHaveBeenCalledWith('Job has expired', expect.any(Object));
      });
    });

    describe('application', () => {
      it('calls toast.success for accepted with job title in description', () => {
        toastMessages.application.accepted('Fix my plumbing');
        expect(mockToast.success).toHaveBeenCalledWith(
          'Application accepted!',
          expect.objectContaining({
            description: expect.stringContaining('Fix my plumbing'),
          })
        );
      });

      it('calls toast.info for rejected with job title in description', () => {
        toastMessages.application.rejected('Build a website');
        expect(mockToast.info).toHaveBeenCalledWith(
          'Application not selected',
          expect.objectContaining({
            description: expect.stringContaining('Build a website'),
          })
        );
      });

      it('calls toast.info for withdrawn', () => {
        toastMessages.application.withdrawn();
        expect(mockToast.info).toHaveBeenCalledWith(
          'Application withdrawn',
          expect.any(Object)
        );
      });
    });

    describe('message', () => {
      it('calls toast.success for sent', () => {
        toastMessages.message.sent();
        expect(mockToast.success).toHaveBeenCalledWith('Message sent', expect.any(Object));
      });

      it('calls toast.error for failed', () => {
        toastMessages.message.failed();
        expect(mockToast.error).toHaveBeenCalledWith(
          'Message failed to send',
          expect.any(Object)
        );
      });

      it('calls toast.info for newMessage with sender name', () => {
        toastMessages.message.newMessage('Alice');
        expect(mockToast.info).toHaveBeenCalledWith(
          'New message from Alice',
          expect.objectContaining({ description: 'Click to view conversation' })
        );
      });
    });

    describe('profile', () => {
      it('calls toast.success for updated', () => {
        toastMessages.profile.updated();
        expect(mockToast.success).toHaveBeenCalledWith('Profile updated', expect.any(Object));
      });

      it('calls toast.success for photoUpdated', () => {
        toastMessages.profile.photoUpdated();
        expect(mockToast.success).toHaveBeenCalledWith(
          'Profile photo updated',
          expect.any(Object)
        );
      });

      it('calls toast.success for phoneUpdated', () => {
        toastMessages.profile.phoneUpdated();
        expect(mockToast.success).toHaveBeenCalledWith(
          'Phone number updated',
          expect.any(Object)
        );
      });

      it('calls toast.success for usernameChanged with new username in description', () => {
        toastMessages.profile.usernameChanged('newusername');
        expect(mockToast.success).toHaveBeenCalledWith(
          'Username changed',
          expect.objectContaining({ description: expect.stringContaining('newusername') })
        );
      });
    });

    describe('auth', () => {
      it('calls toast.success for signedIn', () => {
        toastMessages.auth.signedIn();
        expect(mockToast.success).toHaveBeenCalledWith('Welcome back!', expect.any(Object));
      });

      it('calls toast.success for signedOut', () => {
        toastMessages.auth.signedOut();
        expect(mockToast.success).toHaveBeenCalledWith('Signed out', expect.any(Object));
      });

      it('calls toast.success for verificationSent', () => {
        toastMessages.auth.verificationSent();
        expect(mockToast.success).toHaveBeenCalledWith('Verification sent', expect.any(Object));
      });

      it('calls toast.success for verified', () => {
        toastMessages.auth.verified();
        expect(mockToast.success).toHaveBeenCalledWith('Account verified!', expect.any(Object));
      });
    });

    describe('payment', () => {
      it('calls toast.success for successful', () => {
        toastMessages.payment.successful();
        expect(mockToast.success).toHaveBeenCalledWith('Payment successful!', expect.any(Object));
      });

      it('calls toast.error for failed', () => {
        toastMessages.payment.failed();
        expect(mockToast.error).toHaveBeenCalledWith('Payment failed', expect.any(Object));
      });

      it('calls toast.info for refunded', () => {
        toastMessages.payment.refunded();
        expect(mockToast.info).toHaveBeenCalledWith('Refund processed', expect.any(Object));
      });
    });

    describe('system', () => {
      it('calls toast.error for connectionLost with duration', () => {
        toastMessages.system.connectionLost();
        expect(mockToast.error).toHaveBeenCalledWith(
          'Connection lost',
          expect.objectContaining({ duration: 5000 })
        );
      });

      it('calls toast.success for connectionRestored', () => {
        toastMessages.system.connectionRestored();
        expect(mockToast.success).toHaveBeenCalledWith(
          'Connection restored',
          expect.any(Object)
        );
      });

      it('calls toast.warning for maintenanceMode', () => {
        toastMessages.system.maintenanceMode();
        expect(mockToast.warning).toHaveBeenCalledWith(
          'Scheduled maintenance',
          expect.any(Object)
        );
      });

      it('calls toast.info for featureUnavailable', () => {
        toastMessages.system.featureUnavailable();
        expect(mockToast.info).toHaveBeenCalledWith('Feature coming soon', expect.any(Object));
      });
    });

    describe('error', () => {
      it('calls toast.error for generic', () => {
        toastMessages.error.generic();
        expect(mockToast.error).toHaveBeenCalledWith('Something went wrong', expect.any(Object));
      });

      it('calls toast.error for network', () => {
        toastMessages.error.network();
        expect(mockToast.error).toHaveBeenCalledWith('Network error', expect.any(Object));
      });

      it('calls toast.error for unauthorized', () => {
        toastMessages.error.unauthorized();
        expect(mockToast.error).toHaveBeenCalledWith('Access denied', expect.any(Object));
      });

      it('calls toast.error for rateLimit', () => {
        toastMessages.error.rateLimit();
        expect(mockToast.error).toHaveBeenCalledWith('Too many requests', expect.any(Object));
      });
    });

    describe('success', () => {
      it('calls toast.success for saved', () => {
        toastMessages.success.saved();
        expect(mockToast.success).toHaveBeenCalledWith('Changes saved', expect.any(Object));
      });

      it('calls toast.success for copied', () => {
        toastMessages.success.copied();
        expect(mockToast.success).toHaveBeenCalledWith(
          'Copied to clipboard',
          expect.any(Object)
        );
      });

      it('calls toast.success for shared', () => {
        toastMessages.success.shared();
        expect(mockToast.success).toHaveBeenCalledWith('Link shared', expect.any(Object));
      });
    });
  });

  describe('showToast', () => {
    it('calls toast.success with message and description', () => {
      showToast.success('Title', 'Details');
      expect(mockToast.success).toHaveBeenCalledWith('Title', { description: 'Details' });
    });

    it('calls toast.success without description', () => {
      showToast.success('Title');
      expect(mockToast.success).toHaveBeenCalledWith('Title', { description: undefined });
    });

    it('calls toast.error with message and description', () => {
      showToast.error('Error title', 'Error detail');
      expect(mockToast.error).toHaveBeenCalledWith('Error title', {
        description: 'Error detail',
      });
    });

    it('calls toast.info with message', () => {
      showToast.info('Info message');
      expect(mockToast.info).toHaveBeenCalledWith('Info message', { description: undefined });
    });

    it('calls toast.warning with message', () => {
      showToast.warning('Warning message');
      expect(mockToast.warning).toHaveBeenCalledWith('Warning message', {
        description: undefined,
      });
    });

    it('calls toast.loading with message', () => {
      showToast.loading('Loading...');
      expect(mockToast.loading).toHaveBeenCalledWith('Loading...');
    });
  });

  describe('contextToast', () => {
    it('invokes the correct handler for a known context and action', () => {
      contextToast('job', 'posted');
      expect(mockToast.success).toHaveBeenCalledWith(
        'Job posted successfully!',
        expect.any(Object)
      );
    });

    it('invokes handler with data payload', () => {
      contextToast('application', 'accepted', 'Paint my house');
      expect(mockToast.success).toHaveBeenCalledWith(
        'Application accepted!',
        expect.objectContaining({
          description: expect.stringContaining('Paint my house'),
        })
      );
    });

    it('falls back to error.generic for unknown context', () => {
      contextToast('nonexistent_context', 'someAction');
      expect(mockToast.error).toHaveBeenCalledWith('Something went wrong', expect.any(Object));
    });

    it('falls back to error.generic for unknown action in known context', () => {
      contextToast('job', 'nonexistent_action');
      expect(mockToast.error).toHaveBeenCalledWith('Something went wrong', expect.any(Object));
    });
  });
});
