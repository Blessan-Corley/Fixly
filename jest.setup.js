// jest.setup.js - Jest testing configuration
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard',
    query: {},
    asPath: '/dashboard'
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams()
}));

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    const React = require('react');
    return React.createElement('img', props);
  }
}));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'fixer'
      },
      accessToken: 'test-token'
    },
    status: 'authenticated'
  }),
  SessionProvider: ({ children }) => children,
  signIn: jest.fn(),
  signOut: jest.fn()
}));

// Mock Ably Real-time
jest.mock('ably', () => ({
  Realtime: jest.fn(() => ({
    channels: {
      get: jest.fn(() => ({
        publish: jest.fn(() => Promise.resolve()),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        presence: {
          enter: jest.fn(() => Promise.resolve()),
          leave: jest.fn(() => Promise.resolve()),
          update: jest.fn(() => Promise.resolve()),
          get: jest.fn(() => Promise.resolve([]))
        },
        detach: jest.fn()
      }))
    },
    connection: {
      state: 'connected',
      on: jest.fn(),
      off: jest.fn()
    },
    close: jest.fn()
  }))
}));

// Mock Redis
jest.mock('./lib/redis', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    invalidatePattern: jest.fn(),
    getOrSet: jest.fn()
  },
  analytics: {
    trackEvent: jest.fn(),
    getEventCount: jest.fn()
  },
  session: {
    get: jest.fn(),
    set: jest.fn(),
    destroy: jest.fn(),
    touch: jest.fn()
  },
  pubsub: {
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  },
  redisRateLimit: jest.fn(() => ({
    success: true,
    count: 1,
    remaining: 99,
    resetTime: Date.now() + 3600000
  })),
  redisHealthCheck: jest.fn(() => Promise.resolve(true))
}));

// Mock MongoDB
jest.mock('./lib/mongodb', () => ({
  connectDB: jest.fn(),
  db: {
    collection: jest.fn(() => ({
      find: jest.fn(() => ({
        toArray: jest.fn(() => Promise.resolve([])),
        limit: jest.fn(() => ({
          toArray: jest.fn(() => Promise.resolve([]))
        })),
        sort: jest.fn(() => ({
          toArray: jest.fn(() => Promise.resolve([])),
          limit: jest.fn(() => ({
            toArray: jest.fn(() => Promise.resolve([]))
          }))
        }))
      })),
      findOne: jest.fn(() => Promise.resolve(null)),
      insertOne: jest.fn(() => Promise.resolve({ insertedId: 'test-id' })),
      updateOne: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
      deleteOne: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
      countDocuments: jest.fn(() => Promise.resolve(0))
    }))
  }
}));

// Mock Firebase
jest.mock('./lib/firebase-client', () => ({
  auth: {
    currentUser: {
      uid: 'test-firebase-user',
      email: 'test@example.com'
    },
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn()
  },
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ data: () => ({}) })),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve())
      })),
      add: jest.fn(() => Promise.resolve({ id: 'test-doc-id' })),
      where: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ docs: [] }))
      }))
    }))
  }
}));

// Mock Framer Motion
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: ({ children, ...props }) => React.createElement('div', props, children),
      span: ({ children, ...props }) => React.createElement('span', props, children),
      button: ({ children, ...props }) => React.createElement('button', props, children),
      img: ({ children, ...props }) => React.createElement('img', props),
      form: ({ children, ...props }) => React.createElement('form', props, children)
    },
    AnimatePresence: ({ children }) => children,
    useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn()
  }),
  useMotionValue: () => ({ get: jest.fn(), set: jest.fn() }),
  useTransform: () => ({ get: jest.fn() }),
  useSpring: () => ({ get: jest.fn() }),
  useInView: () => false,
  useDragControls: () => ({
    start: jest.fn()
  })
  };
});

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn()
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
    data: null
  })),
  useInfiniteQuery: jest.fn(() => ({
    data: { pages: [] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isLoading: false,
    error: null
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    prefetchQuery: jest.fn()
  })),
  QueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    prefetchQuery: jest.fn()
  })),
  QueryClientProvider: ({ children }) => children
}));

// Mock Sonner (toast notifications)
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  },
  Toaster: () => null
}));

// Mock React Dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: jest.fn(() => ({})),
    getInputProps: jest.fn(() => ({})),
    isDragActive: false,
    acceptedFiles: [],
    rejectedFiles: []
  }))
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => {
  const React = require('react');
  const MockIcon = (props) => React.createElement('div', { 'data-testid': 'lucide-icon', ...props });
  return new Proxy({}, {
    get: () => MockIcon
  });
});

// Mock Web APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock Geolocation API
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn((success) => 
      success({
        coords: {
          latitude: 19.0760,
          longitude: 72.8777,
          accuracy: 10
        }
      })
    ),
    watchPosition: jest.fn(),
    clearWatch: jest.fn()
  }
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
    headers: new Headers()
  })
);

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    now: jest.fn(() => Date.now()),
    navigation: {
      type: 'navigate'
    },
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  }
});

// Mock Service Worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(() => Promise.resolve({})),
    ready: Promise.resolve({
      sync: {
        register: jest.fn()
      }
    }),
    controller: null
  }
});

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: class Notification {
    constructor(title, options) {
      this.title = title;
      this.options = options;
    }
    static requestPermission() {
      return Promise.resolve('granted');
    }
    static permission = 'granted';
  }
});

// Setup console error suppression for expected errors
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: render') ||
       args[0].includes('Not implemented: navigation'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/fixly-test';
process.env.REDIS_URL = 'redis://localhost:6379';

export default {};