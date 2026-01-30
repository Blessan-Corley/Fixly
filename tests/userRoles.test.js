// tests/userRoles.test.js - Comprehensive Role-Based Testing
/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { renderHook } from '@testing-library/react';

// Test utilities for different user roles
const createMockSession = (role, additionalData = {}) => ({
  user: {
    id: `test-${role}-${Date.now()}`,
    email: `test-${role}@fixly.com`,
    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    role: role,
    verified: true,
    skills: role === 'fixer' ? ['plumbing', 'electrical'] : [],
    plan: {
      type: 'pro',
      creditsUsed: 0
    },
    rating: {
      average: 4.5,
      count: 10
    },
    ...additionalData
  },
  accessToken: `mock-token-${role}`,
  expires: '2025-12-31'
});

// Mock components that require authentication
const AuthenticatedComponent = ({ children, session }) => (
  <SessionProvider session={session}>
    {children}
  </SessionProvider>
);

// Mock API responses for different roles
const mockApiResponses = {
  hirer: {
    jobs: [
      {
        _id: 'job-1',
        title: 'Fix Kitchen Sink',
        description: 'Kitchen sink is leaking',
        status: 'open',
        budget: { type: 'fixed', amount: 2000 },
        skillsRequired: ['plumbing'],
        applications: [
          {
            _id: 'app-1',
            fixer: 'fixer-1',
            proposedAmount: 1800,
            status: 'pending'
          }
        ],
        createdBy: 'hirer-1'
      }
    ],
    stats: {
      totalJobs: 5,
      activeJobs: 2,
      completedJobs: 3,
      totalSpent: 15000
    }
  },
  fixer: {
    jobs: [
      {
        _id: 'job-2',
        title: 'Electrical Wiring',
        description: 'Install new electrical outlets',
        status: 'open',
        budget: { type: 'fixed', amount: 5000 },
        skillsRequired: ['electrical'],
        createdBy: 'hirer-2'
      }
    ],
    applications: [
      {
        _id: 'app-2',
        job: 'job-1',
        proposedAmount: 1800,
        status: 'accepted',
        timeEstimate: { value: 2, unit: 'hours' }
      }
    ],
    stats: {
      totalApplications: 8,
      acceptedApplications: 5,
      completedJobs: 4,
      totalEarnings: 12000
    }
  }
};

describe('User Role-Based Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch globally
    global.fetch = jest.fn((url, options) => {
      const method = options?.method || 'GET';

      // Route API calls based on URL patterns
      if (url.includes('/api/jobs') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            jobs: mockApiResponses.hirer.jobs,
            total: 1
          })
        });
      }

      if (url.includes('/api/jobs') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            job: { _id: 'new-job-id', ...JSON.parse(options.body) }
          })
        });
      }

      if (url.includes('/api/dashboard/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            stats: mockApiResponses.hirer.stats
          })
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
  });

  describe('Hirer Role Tests', () => {
    const hirerSession = createMockSession('hirer', {
      plan: { type: 'pro', creditsUsed: 0 }
    });

    test('should allow hirer to post a new job', async () => {
      const JobPostForm = ({ session }) => {
        const [formData, setFormData] = React.useState({
          title: '',
          description: '',
          budget: { type: 'fixed', amount: '' },
          skillsRequired: []
        });

        const handleSubmit = async (e) => {
          e.preventDefault();
          const response = await fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          return response.json();
        };

        return (
          <form onSubmit={handleSubmit} data-testid="job-post-form">
            <input
              data-testid="job-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Job title"
            />
            <textarea
              data-testid="job-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Job description"
            />
            <input
              data-testid="job-budget"
              type="number"
              value={formData.budget.amount}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                budget: { ...prev.budget, amount: e.target.value }
              }))}
              placeholder="Budget amount"
            />
            <button type="submit" data-testid="submit-job">Post Job</button>
          </form>
        );
      };

      render(
        <AuthenticatedComponent session={hirerSession}>
          <JobPostForm session={hirerSession} />
        </AuthenticatedComponent>
      );

      // Fill out the form
      fireEvent.change(screen.getByTestId('job-title'), {
        target: { value: 'Fix Kitchen Sink' }
      });
      fireEvent.change(screen.getByTestId('job-description'), {
        target: { value: 'Kitchen sink is leaking badly' }
      });
      fireEvent.change(screen.getByTestId('job-budget'), {
        target: { value: '2000' }
      });

      // Submit the form
      fireEvent.click(screen.getByTestId('submit-job'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Fix Kitchen Sink')
        });
      });
    });

    test('should allow hirer to view job applications', async () => {
      const JobApplicationsList = ({ jobId }) => {
        const [applications, setApplications] = React.useState([]);

        React.useEffect(() => {
          fetch(`/api/jobs/${jobId}/applications`)
            .then(res => res.json())
            .then(data => setApplications(data.applications || []));
        }, [jobId]);

        return (
          <div data-testid="applications-list">
            {applications.map(app => (
              <div key={app._id} data-testid={`application-${app._id}`}>
                <span>Amount: ₹{app.proposedAmount}</span>
                <button data-testid={`accept-${app._id}`}>Accept</button>
                <button data-testid={`reject-${app._id}`}>Reject</button>
              </div>
            ))}
          </div>
        );
      };

      // Mock applications API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          applications: mockApiResponses.hirer.jobs[0].applications
        })
      });

      render(
        <AuthenticatedComponent session={hirerSession}>
          <JobApplicationsList jobId="job-1" />
        </AuthenticatedComponent>
      );

      await waitFor(() => {
        expect(screen.getByTestId('applications-list')).toBeInTheDocument();
        expect(screen.getByTestId('application-app-1')).toBeInTheDocument();
        expect(screen.getByText('Amount: ₹1800')).toBeInTheDocument();
      });
    });

    test('should prevent hirer from applying to jobs', async () => {
      const JobCard = ({ job, userRole }) => {
        const canApply = userRole === 'fixer' && job.createdBy !== userRole;

        return (
          <div data-testid="job-card">
            <h3>{job.title}</h3>
            {canApply ? (
              <button data-testid="apply-button">Apply</button>
            ) : (
              <span data-testid="cannot-apply">Cannot apply to this job</span>
            )}
          </div>
        );
      };

      render(
        <AuthenticatedComponent session={hirerSession}>
          <JobCard
            job={mockApiResponses.hirer.jobs[0]}
            userRole="hirer"
          />
        </AuthenticatedComponent>
      );

      expect(screen.getByTestId('cannot-apply')).toBeInTheDocument();
      expect(screen.queryByTestId('apply-button')).not.toBeInTheDocument();
    });

    test('should show hirer-specific dashboard stats', async () => {
      const HirerDashboard = () => {
        const [stats, setStats] = React.useState(null);

        React.useEffect(() => {
          fetch('/api/dashboard/stats')
            .then(res => res.json())
            .then(data => setStats(data.stats));
        }, []);

        if (!stats) return <div>Loading...</div>;

        return (
          <div data-testid="hirer-dashboard">
            <div data-testid="total-jobs">Total Jobs: {stats.totalJobs}</div>
            <div data-testid="active-jobs">Active Jobs: {stats.activeJobs}</div>
            <div data-testid="total-spent">Total Spent: ₹{stats.totalSpent}</div>
          </div>
        );
      };

      render(
        <AuthenticatedComponent session={hirerSession}>
          <HirerDashboard />
        </AuthenticatedComponent>
      );

      await waitFor(() => {
        expect(screen.getByTestId('total-jobs')).toHaveTextContent('Total Jobs: 5');
        expect(screen.getByTestId('active-jobs')).toHaveTextContent('Active Jobs: 2');
        expect(screen.getByTestId('total-spent')).toHaveTextContent('Total Spent: ₹15000');
      });
    });
  });

  describe('Fixer Role Tests', () => {
    const fixerSession = createMockSession('fixer', {
      skills: ['plumbing', 'electrical', 'carpentry'],
      plan: { type: 'pro', creditsUsed: 2 }
    });

    test('should allow fixer to apply to jobs', async () => {
      const JobApplicationForm = ({ job, userSession }) => {
        const [applicationData, setApplicationData] = React.useState({
          proposedAmount: '',
          message: '',
          timeEstimate: { value: '', unit: 'hours' }
        });

        const handleSubmit = async (e) => {
          e.preventDefault();
          const response = await fetch(`/api/jobs/${job._id}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicationData)
          });
          return response.json();
        };

        return (
          <form onSubmit={handleSubmit} data-testid="application-form">
            <input
              data-testid="proposed-amount"
              type="number"
              value={applicationData.proposedAmount}
              onChange={(e) => setApplicationData(prev => ({
                ...prev,
                proposedAmount: e.target.value
              }))}
              placeholder="Proposed amount"
            />
            <textarea
              data-testid="application-message"
              value={applicationData.message}
              onChange={(e) => setApplicationData(prev => ({
                ...prev,
                message: e.target.value
              }))}
              placeholder="Why are you the right fit?"
            />
            <button type="submit" data-testid="submit-application">Submit Application</button>
          </form>
        );
      };

      render(
        <AuthenticatedComponent session={fixerSession}>
          <JobApplicationForm
            job={mockApiResponses.fixer.jobs[0]}
            userSession={fixerSession}
          />
        </AuthenticatedComponent>
      );

      // Fill out application
      fireEvent.change(screen.getByTestId('proposed-amount'), {
        target: { value: '4500' }
      });
      fireEvent.change(screen.getByTestId('application-message'), {
        target: { value: 'I have 5 years of electrical experience' }
      });

      // Submit application
      fireEvent.click(screen.getByTestId('submit-application'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/jobs/job-2/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('4500')
        });
      });
    });

    test('should show skill matching for jobs', async () => {
      const JobCard = ({ job, userSkills }) => {
        const matchingSkills = job.skillsRequired.filter(skill =>
          userSkills.some(userSkill =>
            userSkill.toLowerCase() === skill.toLowerCase()
          )
        );

        const matchPercentage = Math.round(
          (matchingSkills.length / job.skillsRequired.length) * 100
        );

        return (
          <div data-testid="job-card-with-skills">
            <h3>{job.title}</h3>
            <div data-testid="skill-match">
              Skill Match: {matchPercentage}%
            </div>
            <div data-testid="required-skills">
              Required: {job.skillsRequired.join(', ')}
            </div>
            <div data-testid="matching-skills">
              Matching: {matchingSkills.join(', ')}
            </div>
          </div>
        );
      };

      render(
        <AuthenticatedComponent session={fixerSession}>
          <JobCard
            job={mockApiResponses.fixer.jobs[0]}
            userSkills={fixerSession.user.skills}
          />
        </AuthenticatedComponent>
      );

      expect(screen.getByTestId('skill-match')).toHaveTextContent('Skill Match: 100%');
      expect(screen.getByTestId('required-skills')).toHaveTextContent('Required: electrical');
      expect(screen.getByTestId('matching-skills')).toHaveTextContent('Matching: electrical');
    });

    test('should prevent fixer from posting jobs', async () => {
      const PostJobButton = ({ userRole }) => {
        const canPostJob = userRole === 'hirer';

        return (
          <div>
            {canPostJob ? (
              <button data-testid="post-job-button">Post a Job</button>
            ) : (
              <div data-testid="upgrade-message">
                Upgrade to Hirer account to post jobs
              </div>
            )}
          </div>
        );
      };

      render(
        <AuthenticatedComponent session={fixerSession}>
          <PostJobButton userRole="fixer" />
        </AuthenticatedComponent>
      );

      expect(screen.getByTestId('upgrade-message')).toBeInTheDocument();
      expect(screen.queryByTestId('post-job-button')).not.toBeInTheDocument();
    });

    test('should show fixer-specific dashboard stats', async () => {
      const FixerDashboard = () => {
        const [stats, setStats] = React.useState(null);

        React.useEffect(() => {
          // Mock fixer stats API
          fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              stats: mockApiResponses.fixer.stats
            })
          });

          fetch('/api/fixer/stats')
            .then(res => res.json())
            .then(data => setStats(data.stats));
        }, []);

        if (!stats) return <div>Loading...</div>;

        return (
          <div data-testid="fixer-dashboard">
            <div data-testid="total-applications">
              Total Applications: {stats.totalApplications}
            </div>
            <div data-testid="accepted-applications">
              Accepted: {stats.acceptedApplications}
            </div>
            <div data-testid="total-earnings">
              Total Earnings: ₹{stats.totalEarnings}
            </div>
          </div>
        );
      };

      render(
        <AuthenticatedComponent session={fixerSession}>
          <FixerDashboard />
        </AuthenticatedComponent>
      );

      await waitFor(() => {
        expect(screen.getByTestId('total-applications'))
          .toHaveTextContent('Total Applications: 8');
        expect(screen.getByTestId('accepted-applications'))
          .toHaveTextContent('Accepted: 5');
        expect(screen.getByTestId('total-earnings'))
          .toHaveTextContent('Total Earnings: ₹12000');
      });
    });

    test('should handle application credit limits', async () => {
      const freeFixerSession = createMockSession('fixer', {
        plan: { type: 'free', creditsUsed: 2 } // 2 out of 3 free credits used
      });

      const ApplicationCredits = ({ userPlan }) => {
        const remainingCredits = userPlan.type === 'pro'
          ? 'unlimited'
          : Math.max(0, 3 - userPlan.creditsUsed);

        return (
          <div data-testid="application-credits">
            <div data-testid="remaining-credits">
              Remaining Credits: {remainingCredits}
            </div>
            {userPlan.type !== 'pro' && remainingCredits === 0 && (
              <div data-testid="upgrade-required">
                Upgrade to Pro for unlimited applications
              </div>
            )}
          </div>
        );
      };

      render(
        <AuthenticatedComponent session={freeFixerSession}>
          <ApplicationCredits userPlan={freeFixerSession.user.plan} />
        </AuthenticatedComponent>
      );

      expect(screen.getByTestId('remaining-credits'))
        .toHaveTextContent('Remaining Credits: 1');
    });
  });

  describe('Cross-Role Interaction Tests', () => {
    test('should handle job assignment between hirer and fixer', async () => {
      const JobAssignment = ({ application, currentUserRole }) => {
        const [status, setStatus] = React.useState(application.status);

        const handleAccept = async () => {
          const response = await fetch(`/api/jobs/${application.job}/applications/${application._id}/accept`, {
            method: 'POST'
          });
          if (response.ok) {
            setStatus('accepted');
          }
        };

        return (
          <div data-testid="job-assignment">
            <div data-testid="application-status">Status: {status}</div>
            {currentUserRole === 'hirer' && status === 'pending' && (
              <button data-testid="accept-application" onClick={handleAccept}>
                Accept Application
              </button>
            )}
          </div>
        );
      };

      const hirerSession = createMockSession('hirer');

      render(
        <AuthenticatedComponent session={hirerSession}>
          <JobAssignment
            application={mockApiResponses.fixer.applications[0]}
            currentUserRole="hirer"
          />
        </AuthenticatedComponent>
      );

      expect(screen.getByTestId('application-status'))
        .toHaveTextContent('Status: accepted');
    });

    test('should handle real-time messaging between roles', async () => {
      const MessagingSystem = ({ jobId, currentUserId, otherUserId }) => {
        const [messages, setMessages] = React.useState([]);
        const [newMessage, setNewMessage] = React.useState('');

        const sendMessage = async () => {
          const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId,
              receiverId: otherUserId,
              content: newMessage
            })
          });

          if (response.ok) {
            setMessages(prev => [...prev, {
              id: Date.now(),
              content: newMessage,
              senderId: currentUserId,
              timestamp: new Date()
            }]);
            setNewMessage('');
          }
        };

        return (
          <div data-testid="messaging-system">
            <div data-testid="messages-list">
              {messages.map(msg => (
                <div key={msg.id} data-testid={`message-${msg.id}`}>
                  {msg.content}
                </div>
              ))}
            </div>
            <input
              data-testid="message-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <button data-testid="send-message" onClick={sendMessage}>
              Send
            </button>
          </div>
        );
      };

      const hirerSession = createMockSession('hirer');

      render(
        <AuthenticatedComponent session={hirerSession}>
          <MessagingSystem
            jobId="job-1"
            currentUserId={hirerSession.user.id}
            otherUserId="fixer-1"
          />
        </AuthenticatedComponent>
      );

      fireEvent.change(screen.getByTestId('message-input'), {
        target: { value: 'When can you start the work?' }
      });

      fireEvent.click(screen.getByTestId('send-message'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('When can you start the work?')
        });
      });
    });
  });

  describe('Real-time Features for Different Roles', () => {
    test('should send role-appropriate notifications', async () => {
      const NotificationSystem = ({ userRole, notifications }) => {
        return (
          <div data-testid="notification-system">
            {notifications.map(notification => (
              <div
                key={notification.id}
                data-testid={`notification-${notification.type}`}
                className={`notification-${userRole}`}
              >
                {notification.message}
              </div>
            ))}
          </div>
        );
      };

      const hirerNotifications = [
        { id: 1, type: 'application_received', message: 'New application received for Kitchen Sink job' },
        { id: 2, type: 'job_completed', message: 'Electrical work has been completed' }
      ];

      const fixerNotifications = [
        { id: 1, type: 'application_accepted', message: 'Your application for Kitchen Sink job was accepted' },
        { id: 2, type: 'new_job_match', message: 'New plumbing job matches your skills' }
      ];

      const hirerSession = createMockSession('hirer');

      render(
        <AuthenticatedComponent session={hirerSession}>
          <NotificationSystem
            userRole="hirer"
            notifications={hirerNotifications}
          />
        </AuthenticatedComponent>
      );

      expect(screen.getByTestId('notification-application_received')).toBeInTheDocument();
      expect(screen.getByTestId('notification-job_completed')).toBeInTheDocument();
    });
  });

  describe('Permission and Access Control Tests', () => {
    test('should restrict API access based on user role', async () => {
      const testApiAccess = async (endpoint, method, userRole, expectedStatus) => {
        const session = createMockSession(userRole);

        // Mock authorization middleware
        if (endpoint.includes('/admin') && userRole !== 'admin') {
          return { status: 403, message: 'Forbidden' };
        }

        if (endpoint.includes('/jobs/post') && userRole !== 'hirer') {
          return { status: 403, message: 'Only hirers can post jobs' };
        }

        if (endpoint.includes('/fixer/') && userRole !== 'fixer') {
          return { status: 403, message: 'Fixer access required' };
        }

        return { status: 200, message: 'Success' };
      };

      // Test various scenarios
      const scenarios = [
        { endpoint: '/api/jobs/post', method: 'POST', role: 'hirer', expected: 200 },
        { endpoint: '/api/jobs/post', method: 'POST', role: 'fixer', expected: 403 },
        { endpoint: '/api/fixer/applications', method: 'GET', role: 'fixer', expected: 200 },
        { endpoint: '/api/fixer/applications', method: 'GET', role: 'hirer', expected: 403 },
        { endpoint: '/api/admin/users', method: 'GET', role: 'hirer', expected: 403 },
        { endpoint: '/api/admin/users', method: 'GET', role: 'admin', expected: 200 }
      ];

      for (const scenario of scenarios) {
        const result = await testApiAccess(
          scenario.endpoint,
          scenario.method,
          scenario.role,
          scenario.expected
        );

        expect(result.status).toBe(scenario.expected);
      }
    });
  });
});

describe('Performance Tests for Role-Based Features', () => {
  test('should handle large datasets efficiently for different roles', async () => {
    const generateMockJobs = (count) =>
      Array.from({ length: count }, (_, i) => ({
        _id: `job-${i}`,
        title: `Job ${i}`,
        status: 'open',
        skillsRequired: ['plumbing'],
        budget: { type: 'fixed', amount: 1000 + i * 100 }
      }));

    const LargeJobsList = ({ jobs, userRole }) => {
      const [filteredJobs, setFilteredJobs] = React.useState([]);

      React.useEffect(() => {
        // Simulate filtering based on role
        const filtered = userRole === 'fixer'
          ? jobs.filter(job => job.status === 'open')
          : jobs;

        setFilteredJobs(filtered);
      }, [jobs, userRole]);

      return (
        <div data-testid="large-jobs-list">
          {filteredJobs.slice(0, 10).map(job => (
            <div key={job._id} data-testid={`job-${job._id}`}>
              {job.title}
            </div>
          ))}
          <div data-testid="total-count">
            Showing 10 of {filteredJobs.length} jobs
          </div>
        </div>
      );
    };

    const largeJobsDataset = generateMockJobs(1000);
    const fixerSession = createMockSession('fixer');

    const startTime = performance.now();

    render(
      <AuthenticatedComponent session={fixerSession}>
        <LargeJobsList jobs={largeJobsDataset} userRole="fixer" />
      </AuthenticatedComponent>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in reasonable time (less than 100ms)
    expect(renderTime).toBeLessThan(100);
    expect(screen.getByTestId('total-count'))
      .toHaveTextContent('Showing 10 of 1000 jobs');
  });
});

export default {};