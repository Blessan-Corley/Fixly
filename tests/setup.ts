import '@testing-library/jest-dom';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';

type MockSessionStatus = 'authenticated' | 'unauthenticated' | 'loading';

type MockSessionValue = {
  data: { user?: Record<string, unknown> } | null;
  status: MockSessionStatus;
  update: ReturnType<typeof vi.fn>;
};

const defaultRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
};

const defaultSession: MockSessionValue = {
  data: null,
  status: 'unauthenticated',
  update: vi.fn(),
};

const baseEnv: Record<string, string | undefined> = {
  NODE_ENV: 'test',
  NEXTAUTH_URL: 'http://localhost:3000',
  NEXTAUTH_SECRET: 'test-secret',
  MONGODB_URI: 'mongodb://localhost:27017/fixly-test',
  REDIS_URL: 'redis://localhost:6379',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
};

const useRouter = vi.fn(() => defaultRouter);
const useSearchParams = vi.fn(() => new URLSearchParams());
const usePathname = vi.fn(() => '/');
const useSession = vi.fn(() => defaultSession);
const getSession = vi.fn(async () => null);
const signIn = vi.fn(async () => ({ ok: true }));
const signOut = vi.fn(async () => undefined);

Object.defineProperty(globalThis, 'jest', {
  value: vi,
  configurable: true,
  writable: true,
});

vi.mock('@t3-oss/env-nextjs', () => ({
  createEnv: ({ runtimeEnv }: { runtimeEnv: Record<string, string | undefined> }) => runtimeEnv,
}));

vi.mock('@/lib/env', () => {
  const env = new Proxy(baseEnv, {
    get(target, prop) {
      if (typeof prop !== 'string') {
        return undefined;
      }

      return target[prop];
    },
  });

  return { env };
});

vi.mock('next/navigation', () => ({
  useRouter,
  useSearchParams,
  usePathname,
}));

vi.mock('next-auth/react', () => ({
  useSession,
  getSession,
  signIn,
  signOut,
  SessionProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string } & Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    return createElement('img', { src, alt, ...rest });
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode } & Record<string, unknown>) =>
    createElement('a', { href, ...props }, children),
}));

vi.mock('nuqs', () => {
  const createParser = () => ({
    parse: vi.fn((value: unknown) => value),
    serialize: vi.fn((value: unknown) => String(value)),
    withDefault(defaultValue: unknown) {
      return {
        ...this,
        defaultValue,
      };
    },
  });

  const resolveSearchValue = (key: string): string | null => {
    const searchParams = useSearchParams();
    if (!searchParams || typeof searchParams.get !== 'function') {
      return null;
    }

    return searchParams.get(key);
  };

  return {
    parseAsString: createParser(),
    parseAsInteger: createParser(),
    parseAsArrayOf: vi.fn(() => createParser()),
    parseAsStringEnum: vi.fn(() => createParser()),
    useQueryState: vi.fn((key: string) => [resolveSearchValue(key), vi.fn()]),
    useQueryStates: vi.fn((shape: Record<string, unknown>) => {
      const values = Object.keys(shape || {}).reduce<Record<string, string | null>>((acc, key) => {
        acc[key] = resolveSearchValue(key);
        return acc;
      }, {});

      return [values, vi.fn()];
    }),
  };
});

vi.mock('nuqs/adapters/next/app', () => ({
  NuqsAdapter: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock('framer-motion', () => {
  const mockMotionComponent = ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
    createElement('div', props, children);

  return {
    motion: new Proxy({}, { get: () => mockMotionComponent }),
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() }),
    useMotionValue: () => ({ get: vi.fn(), set: vi.fn() }),
    useTransform: () => ({ get: vi.fn() }),
    useSpring: () => ({ get: vi.fn() }),
    useInView: () => false,
    useDragControls: () => ({ start: vi.fn() }),
  };
});

vi.mock('ably', () => ({
  Realtime: vi.fn().mockImplementation(() => ({
    connection: { on: vi.fn(), off: vi.fn(), state: 'connected', close: vi.fn() },
    channels: {
      get: vi.fn().mockReturnValue({
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        publish: vi.fn(),
        detach: vi.fn(),
        presence: { enter: vi.fn(), leave: vi.fn(), update: vi.fn(), get: vi.fn() },
      }),
    },
    close: vi.fn(),
    auth: {
      authorize: vi.fn(),
      createTokenRequest: vi.fn(),
    },
  })),
  Rest: vi.fn().mockImplementation(() => ({
    channels: {
      get: vi.fn().mockReturnValue({
        publish: vi.fn(),
        history: vi.fn(),
      }),
    },
    auth: {
      createTokenRequest: vi.fn(),
    },
  })),
}));

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: vi.fn(),
  });

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
  });
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [];
  };
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

const originalConsoleError = console.error;

beforeEach(() => {
  useRouter.mockReturnValue(defaultRouter);
  useSearchParams.mockReturnValue(new URLSearchParams());
  usePathname.mockReturnValue('/');
  useSession.mockReturnValue({
    data: null,
    status: 'unauthenticated',
    update: vi.fn(),
  });
  getSession.mockResolvedValue(null);
  signIn.mockResolvedValue({ ok: true });
  signOut.mockResolvedValue(undefined);
  console.error = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
  console.error = originalConsoleError;
});
