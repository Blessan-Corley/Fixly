// tests/endToEndWorkflows.test.js - Comprehensive End-to-End Workflow Tests
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard'
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn()
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock location services
Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn()
  },
  writable: true
});

// Mock Ably
const mockAblyChannel = {
  publish: jest.fn(() => Promise.resolve()),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  presence: {
    enter: jest.fn(() => Promise.resolve()),
    leave: jest.fn(() => Promise.resolve())
  }
};

jest.mock('../contexts/AblyContext', () => ({
  AblyProvider: ({ children }) => children,
  useAblyChannel: jest.fn(() => ({ unsubscribe: jest.fn() }))
}));

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    loading: jest.fn()
  }
}));

describe('End-to-End Workflow Tests', () => {
  let mockSession;
  let user;

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();

    // Default session setup
    mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'hirer'
      }
    };

    require('next-auth/react').useSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    });

    // Default successful fetch responses
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {}
      })
    });

    // Mock geolocation
    global.navigator.geolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 19.0760,
          longitude: 72.8777,
          accuracy: 10
        }
      });
    });
  });

  describe('Job Posting Workflow (Hirer)', () => {
    test('should complete full job posting workflow', async () => {
      const JobPostingForm = ({ onSubmit }) => (
        <form onSubmit={onSubmit}>
          <input
            name="title"
            placeholder="Job title"
            data-testid="job-title"
          />
          <textarea
            name="description"
            placeholder="Job description"
            data-testid="job-description"
          />
          <input
            name="budget"
            type="number"
            placeholder="Budget"
            data-testid="job-budget"
          />
          <select name="skillsRequired" data-testid="skills-select">
            <option value="">Select skills</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
          </select>
          <button type="submit" data-testid="submit-job">
            Post Job
          </button>
        </form>
      );

      const handleSubmit = jest.fn(async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const jobData = {
          title: formData.get('title'),
          description: formData.get('description'),
          budget: { amount: parseInt(formData.get('budget')), type: 'fixed' },
          skillsRequired: [formData.get('skillsRequired')],
          location: {
            coordinates: { latitude: 19.0760, longitude: 72.8777 },
            address: 'Mumbai, Maharashtra'
          }
        };

        // Mock API call
        const response = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jobData)
        });

        return response.json();
      });

      render(<JobPostingForm onSubmit={handleSubmit} />);

      // Fill job posting form
      await user.type(screen.getByTestId('job-title'), 'Fix Kitchen Sink');
      await user.type(
        screen.getByTestId('job-description'),
        'Kitchen sink is leaking and needs urgent repair'
      );
      await user.type(screen.getByTestId('job-budget'), '2500');
      await user.selectOptions(screen.getByTestId('skills-select'), 'plumbing');

      // Submit job
      await user.click(screen.getByTestId('submit-job'));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      // Verify API was called with correct data
      expect(fetch).toHaveBeenCalledWith('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Fix Kitchen Sink',
          description: 'Kitchen sink is leaking and needs urgent repair',
          budget: { amount: 2500, type: 'fixed' },
          skillsRequired: ['plumbing'],
          location: {
            coordinates: { latitude: 19.0760, longitude: 72.8777 },
            address: 'Mumbai, Maharashtra'
          }
        })
      });
    });

    test('should handle job posting validation errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          message: 'Job title is required'
        })
      });

      const JobPostingForm = ({ onError }) => (
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            const response = await fetch('/api/jobs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: '' }) // Invalid data
            });

            if (!response.ok) {
              const error = await response.json();
              onError(error.message);
            }
          } catch (error) {
            onError('Network error');
          }
        }}>
          <button type="submit" data-testid="submit-job">
            Post Job
          </button>
        </form>
      );

      const handleError = jest.fn();
      render(<JobPostingForm onError={handleError} />);

      await user.click(screen.getByTestId('submit-job'));

      await waitFor(() => {
        expect(handleError).toHaveBeenCalledWith('Job title is required');
      });
    });
  });

  describe('Job Application Workflow (Fixer)', () => {
    beforeEach(() => {
      // Switch to fixer role
      mockSession.user.role = 'fixer';
      require('next-auth/react').useSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      });
    });

    test('should complete job application workflow', async () => {
      const JobApplicationForm = ({ jobId, onSubmit }) => (
        <div>
          <h2>Apply for Job</h2>
          <form onSubmit={onSubmit}>
            <input
              name="proposedBudget"
              type="number"
              placeholder="Your proposed budget"
              data-testid="proposed-budget"
            />
            <textarea
              name="message"
              placeholder="Why you're perfect for this job"
              data-testid="application-message"
            />
            <input
              name="timeline"
              placeholder="Estimated timeline"
              data-testid="timeline"
            />
            <button type="submit" data-testid="submit-application">
              Submit Application
            </button>
          </form>
        </div>
      );

      const handleSubmit = jest.fn(async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const applicationData = {
          proposedBudget: parseInt(formData.get('proposedBudget')),
          message: formData.get('message'),
          timeline: formData.get('timeline')
        };

        const response = await fetch('/api/jobs/job-123/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(applicationData)
        });

        return response.json();
      });

      render(<JobApplicationForm jobId="job-123" onSubmit={handleSubmit} />);

      // Fill application form
      await user.type(screen.getByTestId('proposed-budget'), '2200');
      await user.type(
        screen.getByTestId('application-message'),
        'I have 5 years of plumbing experience and can fix this quickly'
      );
      await user.type(screen.getByTestId('timeline'), '1 day');

      // Submit application
      await user.click(screen.getByTestId('submit-application'));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });

      // Verify API call
      expect(fetch).toHaveBeenCalledWith('/api/jobs/job-123/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedBudget: 2200,
          message: 'I have 5 years of plumbing experience and can fix this quickly',
          timeline: '1 day'
        })
      });
    });

    test('should prevent duplicate applications', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          message: 'You have already applied to this job'
        })
      });

      const ApplicationStatus = ({ onError }) => (
        <button
          data-testid="apply-again"
          onClick={async () => {
            try {
              const response = await fetch('/api/jobs/job-123/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proposedBudget: 2000, message: 'Test' })
              });

              if (!response.ok) {
                const error = await response.json();
                onError(error.message);
              }
            } catch (error) {
              onError('Network error');
            }
          }}
        >
          Apply Again
        </button>
      );

      const handleError = jest.fn();
      render(<ApplicationStatus onError={handleError} />);

      await user.click(screen.getByTestId('apply-again'));

      await waitFor(() => {
        expect(handleError).toHaveBeenCalledWith('You have already applied to this job');
      });
    });
  });

  describe('Real-time Notifications Workflow', () => {
    test('should receive and display real-time notifications', async () => {
      const NotificationComponent = () => {
        const [notifications, setNotifications] = React.useState([]);

        // Mock Ably channel subscription
        React.useEffect(() => {
          const { useAblyChannel } = require('../contexts/AblyContext');
          useAblyChannel(
            `user:${mockSession.user.id}:notifications`,
            'notification_sent',
            (message) => {
              setNotifications(prev => [...prev, message.data]);
            }
          );
        }, []);

        return (
          <div>
            <h2>Notifications</h2>
            {notifications.map((notification, index) => (
              <div key={index} data-testid={`notification-${index}`}>
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
              </div>
            ))}
          </div>
        );
      };

      render(<NotificationComponent />);

      // Simulate receiving a notification
      const { useAblyChannel } = require('../contexts/AblyContext');
      const mockCallback = useAblyChannel.mock.calls[0][2];

      act(() => {
        mockCallback({
          data: {
            id: 'notification-1',
            title: 'New Job Application',
            message: 'You have received a new application for your job',
            type: 'JOB_APPLICATION'
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-0')).toBeInTheDocument();
        expect(screen.getByText('New Job Application')).toBeInTheDocument();
      });
    });

    test('should handle notification interactions', async () => {
      const InteractiveNotification = ({ notification, onMarkAsRead }) => (
        <div data-testid="notification">
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
          <button
            data-testid="mark-read"
            onClick={() => onMarkAsRead(notification.id)}
          >
            Mark as Read
          </button>
        </div>
      );

      const handleMarkAsRead = jest.fn(async (notificationId) => {
        await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'POST'
        });
      });

      const notification = {
        id: 'notification-1',
        title: 'Test Notification',
        message: 'Test message'
      };

      render(
        <InteractiveNotification
          notification={notification}
          onMarkAsRead={handleMarkAsRead}
        />
      );

      await user.click(screen.getByTestId('mark-read'));

      expect(handleMarkAsRead).toHaveBeenCalledWith('notification-1');
      expect(fetch).toHaveBeenCalledWith('/api/notifications/notification-1/read', {
        method: 'POST'
      });
    });
  });

  describe('Comment System Workflow', () => {
    test('should post and display comments in real-time', async () => {
      const CommentSystem = ({ jobId }) => {
        const [comments, setComments] = React.useState([]);
        const [newComment, setNewComment] = React.useState('');

        React.useEffect(() => {
          const { useAblyChannel } = require('../contexts/AblyContext');
          useAblyChannel(
            `job:${jobId}:comments`,
            'comment_posted',
            (message) => {
              setComments(prev => [...prev, message.data.comment]);
            }
          );
        }, [jobId]);

        const handleSubmit = async (e) => {
          e.preventDefault();
          if (!newComment.trim()) return;

          await fetch(`/api/jobs/${jobId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: newComment,
              parentId: null
            })
          });

          setNewComment('');
        };

        return (
          <div>
            <form onSubmit={handleSubmit}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                data-testid="comment-input"
              />
              <button type="submit" data-testid="submit-comment">
                Post Comment
              </button>
            </form>
            <div>
              {comments.map((comment, index) => (
                <div key={index} data-testid={`comment-${index}`}>
                  <p>{comment.content}</p>
                  <small>By {comment.author?.name}</small>
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(<CommentSystem jobId="job-123" />);

      // Post a comment
      await user.type(
        screen.getByTestId('comment-input'),
        'Great job posting! I have some questions.'
      );
      await user.click(screen.getByTestId('submit-comment'));

      // Verify API call
      expect(fetch).toHaveBeenCalledWith('/api/jobs/job-123/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Great job posting! I have some questions.',
          parentId: null
        })
      });

      // Simulate real-time comment reception
      const { useAblyChannel } = require('../contexts/AblyContext');
      const mockCallback = useAblyChannel.mock.calls[0][2];

      act(() => {
        mockCallback({
          data: {
            comment: {
              id: 'comment-1',
              content: 'Great job posting! I have some questions.',
              author: { name: 'Test User' }
            }
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('comment-0')).toBeInTheDocument();
        expect(screen.getByText('Great job posting! I have some questions.')).toBeInTheDocument();
      });
    });
  });

  describe('Location Tracking Workflow', () => {
    test('should handle location tracking workflow', async () => {
      const LocationTracker = () => {
        const [isTracking, setIsTracking] = React.useState(false);
        const [currentLocation, setCurrentLocation] = React.useState(null);

        const startTracking = async () => {
          try {
            // Get current position
            navigator.geolocation.getCurrentPosition(async (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              };

              setCurrentLocation(location);

              // Start tracking on server
              await fetch('/api/user/location/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'start_tracking',
                  location
                })
              });

              setIsTracking(true);
            });
          } catch (error) {
            console.error('Location tracking error:', error);
          }
        };

        const stopTracking = async () => {
          await fetch('/api/user/location/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'stop_tracking'
            })
          });

          setIsTracking(false);
        };

        return (
          <div>
            <button
              data-testid="start-tracking"
              onClick={startTracking}
              disabled={isTracking}
            >
              Start Tracking
            </button>
            <button
              data-testid="stop-tracking"
              onClick={stopTracking}
              disabled={!isTracking}
            >
              Stop Tracking
            </button>
            {currentLocation && (
              <div data-testid="current-location">
                Lat: {currentLocation.latitude}, Lng: {currentLocation.longitude}
              </div>
            )}
            <div data-testid="tracking-status">
              Status: {isTracking ? 'Tracking' : 'Not Tracking'}
            </div>
          </div>
        );
      };

      render(<LocationTracker />);

      // Start location tracking
      await user.click(screen.getByTestId('start-tracking'));

      await waitFor(() => {
        expect(screen.getByTestId('tracking-status')).toHaveTextContent('Status: Tracking');
        expect(screen.getByTestId('current-location')).toBeInTheDocument();
      });

      // Verify API calls
      expect(fetch).toHaveBeenCalledWith('/api/user/location/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_tracking',
          location: {
            latitude: 19.0760,
            longitude: 72.8777,
            accuracy: 10
          }
        })
      });

      // Stop tracking
      await user.click(screen.getByTestId('stop-tracking'));

      await waitFor(() => {
        expect(screen.getByTestId('tracking-status')).toHaveTextContent('Status: Not Tracking');
      });
    });
  });

  describe('Complete Job Lifecycle Workflow', () => {
    test('should handle complete job lifecycle from posting to completion', async () => {
      const jobLifecycleSteps = [];

      // Step 1: Hirer posts job
      jobLifecycleSteps.push(
        fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Fix Kitchen Sink',
            description: 'Urgent plumbing repair needed',
            budget: { amount: 2500, type: 'fixed' },
            skillsRequired: ['plumbing']
          })
        })
      );

      // Step 2: Fixer applies to job
      jobLifecycleSteps.push(
        fetch('/api/jobs/job-123/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposedBudget: 2200,
            message: 'I can fix this quickly',
            timeline: '1 day'
          })
        })
      );

      // Step 3: Hirer accepts application
      jobLifecycleSteps.push(
        fetch('/api/jobs/job-123/applications/app-456/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acceptedBudget: 2200 })
        })
      );

      // Step 4: Job status updates
      jobLifecycleSteps.push(
        fetch('/api/jobs/job-123/status', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in_progress' })
        })
      );

      // Step 5: Job completion
      jobLifecycleSteps.push(
        fetch('/api/jobs/job-123/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completionNotes: 'Job completed successfully',
            photos: ['photo1.jpg', 'photo2.jpg']
          })
        })
      );

      // Execute all steps
      await Promise.allSettled(jobLifecycleSteps);

      // Verify all API calls were made
      expect(fetch).toHaveBeenCalledTimes(5);

      // Verify specific calls
      expect(fetch).toHaveBeenCalledWith('/api/jobs', expect.any(Object));
      expect(fetch).toHaveBeenCalledWith('/api/jobs/job-123/apply', expect.any(Object));
      expect(fetch).toHaveBeenCalledWith('/api/jobs/job-123/applications/app-456/accept', expect.any(Object));
      expect(fetch).toHaveBeenCalledWith('/api/jobs/job-123/status', expect.any(Object));
      expect(fetch).toHaveBeenCalledWith('/api/jobs/job-123/complete', expect.any(Object));
    });
  });

  describe('Error Recovery Workflows', () => {
    test('should handle network failures gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const NetworkErrorComponent = ({ onError }) => (
        <button
          data-testid="trigger-error"
          onClick={async () => {
            try {
              await fetch('/api/test');
            } catch (error) {
              onError(error.message);
            }
          }}
        >
          Trigger Network Error
        </button>
      );

      const handleError = jest.fn();
      render(<NetworkErrorComponent onError={handleError} />);

      await user.click(screen.getByTestId('trigger-error'));

      await waitFor(() => {
        expect(handleError).toHaveBeenCalledWith('Network error');
      });
    });

    test('should retry failed operations', async () => {
      let callCount = 0;
      fetch.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Temporary error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });

      const RetryComponent = ({ onSuccess, onError }) => {
        const [retrying, setRetrying] = React.useState(false);

        const handleWithRetry = async () => {
          setRetrying(true);
          let attempts = 0;
          const maxAttempts = 3;

          while (attempts < maxAttempts) {
            try {
              const response = await fetch('/api/test');
              const result = await response.json();
              onSuccess(result);
              setRetrying(false);
              return;
            } catch (error) {
              attempts++;
              if (attempts >= maxAttempts) {
                onError(error.message);
                setRetrying(false);
                return;
              }
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            }
          }
        };

        return (
          <button
            data-testid="retry-button"
            onClick={handleWithRetry}
            disabled={retrying}
          >
            {retrying ? 'Retrying...' : 'Test with Retry'}
          </button>
        );
      };

      const handleSuccess = jest.fn();
      const handleError = jest.fn();

      render(
        <RetryComponent
          onSuccess={handleSuccess}
          onError={handleError}
        />
      );

      await user.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(handleSuccess).toHaveBeenCalledWith({ success: true });
      }, { timeout: 5000 });

      expect(fetch).toHaveBeenCalledTimes(3); // Failed twice, succeeded on third
    });
  });

  describe('Performance and Stress Tests', () => {
    test('should handle rapid user interactions', async () => {
      const RapidClickComponent = ({ onClickCount }) => {
        const [count, setCount] = React.useState(0);

        const handleClick = async () => {
          const newCount = count + 1;
          setCount(newCount);

          // Simulate API call for each click
          await fetch(`/api/interactions/${newCount}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interaction: 'click', timestamp: Date.now() })
          });

          onClickCount(newCount);
        };

        return (
          <button data-testid="rapid-click" onClick={handleClick}>
            Click Count: {count}
          </button>
        );
      };

      const handleClickCount = jest.fn();
      render(<RapidClickComponent onClickCount={handleClickCount} />);

      // Simulate rapid clicking
      const clickPromises = [];
      for (let i = 0; i < 20; i++) {
        clickPromises.push(user.click(screen.getByTestId('rapid-click')));
      }

      await Promise.allSettled(clickPromises);

      await waitFor(() => {
        expect(handleClickCount).toHaveBeenCalledTimes(20);
      });

      expect(fetch).toHaveBeenCalledTimes(20);
    });

    test('should handle concurrent workflows', async () => {
      const concurrentOperations = [];

      // Simulate multiple users performing operations simultaneously
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          fetch(`/api/jobs/job-${i}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              proposedBudget: 2000 + i * 100,
              message: `Application ${i}`
            })
          })
        );
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentOperations);
      const endTime = Date.now();

      const successfulOperations = results.filter(r => r.status === 'fulfilled').length;

      expect(successfulOperations).toBe(10);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

export default {};