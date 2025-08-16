// __tests__/integration/AppIntegration.test.js - Integration tests for Fixly
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { jest } from '@jest/globals';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn()
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams()
}));

// Mock Socket.io
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true
  }))
}));

// Mock Redis
jest.mock('../../lib/redis', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incrementCounter: jest.fn(),
    exists: jest.fn()
  },
  analytics: {
    trackEvent: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, cacheTime: 0 },
    mutations: { retry: false }
  }
});

const TestWrapper = ({ children, session = null }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
};

// Mock session data
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'fixer',
    isRegistered: true
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

const mockAdminSession = {
  ...mockSession,
  user: {
    ...mockSession.user,
    role: 'admin',
    isAdmin: true
  }
};

describe('App Integration Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Authentication Flow', () => {
    test('should redirect unauthenticated users to signin', async () => {
      const { ProtectedRoute } = await import('../../app/providers');
      
      render(
        <TestWrapper session={null}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    test('should render protected content for authenticated users', async () => {
      const { ProtectedRoute } = await import('../../app/providers');
      
      render(
        <TestWrapper session={mockSession}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    test('should enforce role-based access control', async () => {
      const { ProtectedRoute } = await import('../../app/providers');
      
      render(
        <TestWrapper session={mockSession}>
          <ProtectedRoute allowedRoles={['admin']}>
            <div>Admin Only Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('Job Listing Integration', () => {
    test('should load and display job listings', async () => {
      const mockJobs = [
        {
          _id: 'job1',
          title: 'Fix Kitchen Sink',
          description: 'Need help fixing a leaky kitchen sink',
          budget: { amount: 150, type: 'fixed' },
          location: { city: 'Mumbai', state: 'Maharashtra' },
          skillsRequired: ['Plumbing'],
          createdAt: new Date().toISOString(),
          applications: [],
          viewCount: 5
        },
        {
          _id: 'job2',
          title: 'Paint Living Room',
          description: 'Looking for someone to paint my living room',
          budget: { amount: 500, type: 'fixed' },
          location: { city: 'Delhi', state: 'Delhi' },
          skillsRequired: ['Painting'],
          createdAt: new Date().toISOString(),
          applications: [],
          viewCount: 12
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jobs: mockJobs,
          hasMore: false,
          currentPage: 1
        })
      });

      const { VirtualJobList } = await import('../../components/jobs/VirtualJobList');
      
      render(
        <TestWrapper session={mockSession}>
          <VirtualJobList user={mockSession.user} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Fix Kitchen Sink')).toBeInTheDocument();
        expect(screen.getByText('Paint Living Room')).toBeInTheDocument();
      });
    });

    test('should handle job application flow', async () => {
      const mockJob = {
        _id: 'job1',
        title: 'Fix Kitchen Sink',
        budget: { amount: 150, type: 'fixed' },
        applications: []
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobs: [mockJob], hasMore: false })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, message: 'Applied successfully' })
        });

      const { default: JobCardRectangular } = await import('../../components/JobCardRectangular');
      
      const user = userEvent.setup();
      const mockOnApply = jest.fn();

      render(
        <TestWrapper session={mockSession}>
          <JobCardRectangular 
            job={mockJob} 
            user={mockSession.user}
            onApply={mockOnApply}
          />
        </TestWrapper>
      );

      const applyButton = screen.getByText('Apply');
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith('job1');
      });
    });
  });

  describe('Search Integration', () => {
    test('should perform search with filters', async () => {
      const mockSearchResults = {
        results: [
          {
            _id: 'job1',
            title: 'Plumbing Work',
            location: { city: 'Mumbai' },
            skillsRequired: ['Plumbing']
          }
        ],
        total: 1
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResults)
      });

      const { default: AdvancedSearch } = await import('../../components/search/AdvancedSearch');
      
      const user = userEvent.setup();
      const mockOnSearch = jest.fn();

      render(
        <TestWrapper session={mockSession}>
          <AdvancedSearch onSearch={mockOnSearch} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText(/search for services/i);
      await user.type(searchInput, 'plumbing');

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'plumbing'
          })
        );
      });
    });
  });

  describe('Real-time Features', () => {
    test('should connect to Socket.io and handle real-time updates', async () => {
      const { useSocket } = await import('../../hooks/useSocket');
      const { renderHook } = await import('@testing-library/react');

      const { result } = renderHook(() => useSocket(), {
        wrapper: ({ children }) => <TestWrapper session={mockSession}>{children}</TestWrapper>
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });

    test('should handle notifications in real-time', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          notifications: [
            {
              _id: 'notif1',
              message: 'New job application received',
              type: 'job_application',
              read: false,
              createdAt: new Date().toISOString()
            }
          ]
        })
      });

      const { useNotifications } = await import('../../hooks/useQuery');
      const { renderHook } = await import('@testing-library/react');

      const { result } = renderHook(() => useNotifications(), {
        wrapper: ({ children }) => <TestWrapper session={mockSession}>{children}</TestWrapper>
      });

      await waitFor(() => {
        expect(result.current.data?.notifications).toHaveLength(1);
        expect(result.current.data?.notifications[0].message).toBe('New job application received');
      });
    });
  });

  describe('Admin Dashboard Integration', () => {
    test('should load admin dashboard for admin users', async () => {
      const mockDashboardData = {
        overview: {
          totalUsers: 150,
          activeUsers: 45,
          totalJobs: 89,
          totalRevenue: 25000
        },
        charts: {
          userGrowth: [],
          jobTrends: []
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboardData)
      });

      const { AdminDashboard } = await import('../../components/dynamic/DynamicComponents');
      
      render(
        <TestWrapper session={mockAdminSession}>
          <AdminDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });

    test('should deny access to admin dashboard for non-admin users', async () => {
      const { AdminDashboard } = await import('../../components/dynamic/DynamicComponents');
      
      render(
        <TestWrapper session={mockSession}>
          <AdminDashboard />
        </TestWrapper>
      );

      // Should show access denied or redirect
      await waitFor(() => {
        expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics', async () => {
      const { PerformanceMonitor } = await import('../../utils/performanceMonitoring');
      
      // Mock performance API
      global.performance = {
        ...global.performance,
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByName: jest.fn(() => [{ duration: 100 }]),
        now: jest.fn(() => Date.now())
      };

      const monitor = new PerformanceMonitor();
      monitor.recordMetric('TEST_METRIC', 100, { test: true });

      expect(monitor.metrics.size).toBeGreaterThan(0);
    });
  });

  describe('Offline Functionality', () => {
    test('should handle offline requests with service worker', async () => {
      // Mock service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: jest.fn(() => Promise.resolve({})),
          ready: Promise.resolve({
            sync: {
              register: jest.fn()
            }
          })
        },
        writable: true
      });

      const { useServiceWorker } = await import('../../hooks/useServiceWorker');
      const { renderHook } = await import('@testing-library/react');

      const { result } = renderHook(() => useServiceWorker());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { useJobs } = await import('../../hooks/useQuery');
      const { renderHook } = await import('@testing-library/react');

      const { result } = renderHook(() => useJobs(), {
        wrapper: ({ children }) => <TestWrapper session={mockSession}>{children}</TestWrapper>
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    test('should display error boundaries for component errors', async () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      const { ErrorBoundary } = await import('../../components/ui/ErrorBoundary');

      render(
        <TestWrapper session={mockSession}>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    test('should render mobile-optimized components on small screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      window.dispatchEvent(new Event('resize'));

      const { MobileHeader } = await import('../../components/ui/MobileOptimized');
      
      render(
        <TestWrapper session={mockSession}>
          <MobileHeader title="Test Page" />
        </TestWrapper>
      );

      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });
  });

  describe('Data Caching', () => {
    test('should cache API responses with React Query', async () => {
      const mockJobData = { jobs: [], hasMore: false };
      
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockJobData)
      });

      const { useJobs } = await import('../../hooks/useQuery');
      const { renderHook } = await import('@testing-library/react');

      const { result, rerender } = renderHook(() => useJobs(), {
        wrapper: ({ children }) => <TestWrapper session={mockSession}>{children}</TestWrapper>
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockJobData);
      });

      // Clear fetch mock and rerender - should use cached data
      fetch.mockClear();
      rerender();

      // Should not make another API call due to caching
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Security', () => {
    test('should sanitize user inputs', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const { default: JobCardRectangular } = await import('../../components/JobCardRectangular');
      
      const maliciousJob = {
        _id: 'job1',
        title: maliciousInput,
        description: 'Normal description',
        budget: { amount: 100, type: 'fixed' },
        location: { city: 'Mumbai', state: 'Maharashtra' },
        skillsRequired: ['Test'],
        createdAt: new Date().toISOString(),
        applications: []
      };

      render(
        <TestWrapper session={mockSession}>
          <JobCardRectangular job={maliciousJob} user={mockSession.user} />
        </TestWrapper>
      );

      // Should not execute script, should show escaped content
      expect(screen.queryByText(maliciousInput)).not.toBeInTheDocument();
    });
  });
});

// Performance benchmarks
describe('Performance Benchmarks', () => {
  test('should render job list within performance budget', async () => {
    const startTime = performance.now();
    
    const mockJobs = Array.from({ length: 50 }, (_, i) => ({
      _id: `job${i}`,
      title: `Job ${i}`,
      description: `Description for job ${i}`,
      budget: { amount: 100 + i, type: 'fixed' },
      location: { city: 'Mumbai', state: 'Maharashtra' },
      skillsRequired: ['Test'],
      createdAt: new Date().toISOString(),
      applications: []
    }));

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobs: mockJobs, hasMore: false })
    });

    const { VirtualJobList } = await import('../../components/jobs/VirtualJobList');
    
    render(
      <TestWrapper session={mockSession}>
        <VirtualJobList user={mockSession.user} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Job 0')).toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 1 second
    expect(renderTime).toBeLessThan(1000);
  });

  test('should handle large datasets efficiently with virtual scrolling', async () => {
    const mockLargeDataset = Array.from({ length: 1000 }, (_, i) => ({
      _id: `job${i}`,
      title: `Job ${i}`,
      description: `Description ${i}`,
      budget: { amount: 100, type: 'fixed' },
      location: { city: 'Mumbai', state: 'Maharashtra' },
      skillsRequired: ['Test'],
      createdAt: new Date().toISOString(),
      applications: []
    }));

    const { VirtualList } = await import('../../components/ui/VirtualList');
    
    const renderItem = (item) => (
      <div key={item._id} style={{ height: '100px' }}>
        {item.title}
      </div>
    );

    render(
      <VirtualList
        items={mockLargeDataset}
        height={400}
        itemHeight={100}
        renderItem={renderItem}
      />
    );

    // Should only render visible items, not all 1000
    const renderedItems = screen.getAllByText(/^Job \d+$/);
    expect(renderedItems.length).toBeLessThan(20); // Should be much less than 1000
  });
});

export default {};