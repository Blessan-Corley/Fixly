// utils/bundleOptimization.js - Bundle size optimization utilities
'use client';

// Tree-shaking optimized imports
export const optimizedImports = {
  // Lucide React - import only needed icons
  icons: {
    Search: () => import('lucide-react/dist/esm/icons/search'),
    User: () => import('lucide-react/dist/esm/icons/user'),
    Bell: () => import('lucide-react/dist/esm/icons/bell'),
    Settings: () => import('lucide-react/dist/esm/icons/settings'),
    Menu: () => import('lucide-react/dist/esm/icons/menu'),
    X: () => import('lucide-react/dist/esm/icons/x'),
    ChevronDown: () => import('lucide-react/dist/esm/icons/chevron-down'),
    MapPin: () => import('lucide-react/dist/esm/icons/map-pin'),
    Clock: () => import('lucide-react/dist/esm/icons/clock'),
    DollarSign: () => import('lucide-react/dist/esm/icons/dollar-sign'),
    Star: () => import('lucide-react/dist/esm/icons/star'),
    Heart: () => import('lucide-react/dist/esm/icons/heart'),
    Share: () => import('lucide-react/dist/esm/icons/share'),
    Filter: () => import('lucide-react/dist/esm/icons/filter'),
    SortAsc: () => import('lucide-react/dist/esm/icons/sort-asc'),
    SortDesc: () => import('lucide-react/dist/esm/icons/sort-desc'),
    Eye: () => import('lucide-react/dist/esm/icons/eye'),
    EyeOff: () => import('lucide-react/dist/esm/icons/eye-off'),
    Send: () => import('lucide-react/dist/esm/icons/send'),
    MessageSquare: () => import('lucide-react/dist/esm/icons/message-square'),
    Phone: () => import('lucide-react/dist/esm/icons/phone'),
    Mail: () => import('lucide-react/dist/esm/icons/mail'),
    Calendar: () => import('lucide-react/dist/esm/icons/calendar'),
    Upload: () => import('lucide-react/dist/esm/icons/upload'),
    Download: () => import('lucide-react/dist/esm/icons/download'),
    Edit: () => import('lucide-react/dist/esm/icons/edit'),
    Trash: () => import('lucide-react/dist/esm/icons/trash'),
    Plus: () => import('lucide-react/dist/esm/icons/plus'),
    Minus: () => import('lucide-react/dist/esm/icons/minus'),
    Check: () => import('lucide-react/dist/esm/icons/check'),
    AlertTriangle: () => import('lucide-react/dist/esm/icons/alert-triangle'),
    Info: () => import('lucide-react/dist/esm/icons/info'),
    HelpCircle: () => import('lucide-react/dist/esm/icons/help-circle'),
    ExternalLink: () => import('lucide-react/dist/esm/icons/external-link'),
    Copy: () => import('lucide-react/dist/esm/icons/copy'),
    Bookmark: () => import('lucide-react/dist/esm/icons/bookmark'),
    ThumbsUp: () => import('lucide-react/dist/esm/icons/thumbs-up'),
    ThumbsDown: () => import('lucide-react/dist/esm/icons/thumbs-down'),
    Zap: () => import('lucide-react/dist/esm/icons/zap'),
    Wifi: () => import('lucide-react/dist/esm/icons/wifi'),
    WifiOff: () => import('lucide-react/dist/esm/icons/wifi-off'),
    Refresh: () => import('lucide-react/dist/esm/icons/refresh-cw'),
    Loader: () => import('lucide-react/dist/esm/icons/loader'),
    Archive: () => import('lucide-react/dist/esm/icons/archive'),
    Tag: () => import('lucide-react/dist/esm/icons/tag'),
    Flag: () => import('lucide-react/dist/esm/icons/flag'),
    Home: () => import('lucide-react/dist/esm/icons/home'),
    Briefcase: () => import('lucide-react/dist/esm/icons/briefcase'),
    Users: () => import('lucide-react/dist/esm/icons/users'),
    TrendingUp: () => import('lucide-react/dist/esm/icons/trending-up'),
    BarChart: () => import('lucide-react/dist/esm/icons/bar-chart'),
    PieChart: () => import('lucide-react/dist/esm/icons/pie-chart'),
    Activity: () => import('lucide-react/dist/esm/icons/activity'),
    Shield: () => import('lucide-react/dist/esm/icons/shield'),
    Lock: () => import('lucide-react/dist/esm/icons/lock'),
    Unlock: () => import('lucide-react/dist/esm/icons/unlock'),
    Key: () => import('lucide-react/dist/esm/icons/key'),
    Globe: () => import('lucide-react/dist/esm/icons/globe'),
    Link: () => import('lucide-react/dist/esm/icons/link'),
    Image: () => import('lucide-react/dist/esm/icons/image'),
    File: () => import('lucide-react/dist/esm/icons/file'),
    Folder: () => import('lucide-react/dist/esm/icons/folder'),
    Camera: () => import('lucide-react/dist/esm/icons/camera'),
    Video: () => import('lucide-react/dist/esm/icons/video'),
    Mic: () => import('lucide-react/dist/esm/icons/mic'),
    MicOff: () => import('lucide-react/dist/esm/icons/mic-off'),
    Volume: () => import('lucide-react/dist/esm/icons/volume-2'),
    VolumeOff: () => import('lucide-react/dist/esm/icons/volume-x'),
    Play: () => import('lucide-react/dist/esm/icons/play'),
    Pause: () => import('lucide-react/dist/esm/icons/pause'),
    Stop: () => import('lucide-react/dist/esm/icons/square'),
    SkipBack: () => import('lucide-react/dist/esm/icons/skip-back'),
    SkipForward: () => import('lucide-react/dist/esm/icons/skip-forward'),
    Repeat: () => import('lucide-react/dist/esm/icons/repeat'),
    Shuffle: () => import('lucide-react/dist/esm/icons/shuffle'),
    Battery: () => import('lucide-react/dist/esm/icons/battery'),
    Bluetooth: () => import('lucide-react/dist/esm/icons/bluetooth'),
    Cpu: () => import('lucide-react/dist/esm/icons/cpu'),
    HardDrive: () => import('lucide-react/dist/esm/icons/hard-drive'),
    Monitor: () => import('lucide-react/dist/esm/icons/monitor'),
    Smartphone: () => import('lucide-react/dist/esm/icons/smartphone'),
    Tablet: () => import('lucide-react/dist/esm/icons/tablet'),
    Laptop: () => import('lucide-react/dist/esm/icons/laptop'),
    Package: () => import('lucide-react/dist/esm/icons/package'),
    Truck: () => import('lucide-react/dist/esm/icons/truck'),
    Navigation: () => import('lucide-react/dist/esm/icons/navigation'),
    Compass: () => import('lucide-react/dist/esm/icons/compass'),
    Map: () => import('lucide-react/dist/esm/icons/map'),
    Layers: () => import('lucide-react/dist/esm/icons/layers'),
    Grid: () => import('lucide-react/dist/esm/icons/grid'),
    List: () => import('lucide-react/dist/esm/icons/list'),
    Layout: () => import('lucide-react/dist/esm/icons/layout'),
    Maximize: () => import('lucide-react/dist/esm/icons/maximize'),
    Minimize: () => import('lucide-react/dist/esm/icons/minimize'),
    Move: () => import('lucide-react/dist/esm/icons/move'),
    Resize: () => import('lucide-react/dist/esm/icons/corner-down-right'),
    Rotate: () => import('lucide-react/dist/esm/icons/rotate-cw'),
    Crop: () => import('lucide-react/dist/esm/icons/crop'),
    Scissors: () => import('lucide-react/dist/esm/icons/scissors'),
    PaintBucket: () => import('lucide-react/dist/esm/icons/paint-bucket'),
    Brush: () => import('lucide-react/dist/esm/icons/paintbrush'),
    Palette: () => import('lucide-react/dist/esm/icons/palette'),
    Contrast: () => import('lucide-react/dist/esm/icons/contrast'),
    Sun: () => import('lucide-react/dist/esm/icons/sun'),
    Moon: () => import('lucide-react/dist/esm/icons/moon'),
    CloudSun: () => import('lucide-react/dist/esm/icons/cloud-sun'),
    CloudRain: () => import('lucide-react/dist/esm/icons/cloud-rain'),
    Umbrella: () => import('lucide-react/dist/esm/icons/umbrella'),
    Thermometer: () => import('lucide-react/dist/esm/icons/thermometer'),
    Wind: () => import('lucide-react/dist/esm/icons/wind'),
    Droplets: () => import('lucide-react/dist/esm/icons/droplets'),
    Flame: () => import('lucide-react/dist/esm/icons/flame'),
    Snowflake: () => import('lucide-react/dist/esm/icons/snowflake'),
    Award: () => import('lucide-react/dist/esm/icons/award'),
    Trophy: () => import('lucide-react/dist/esm/icons/trophy'),
    Medal: () => import('lucide-react/dist/esm/icons/medal'),
    Gift: () => import('lucide-react/dist/esm/icons/gift'),
    PartyPopper: () => import('lucide-react/dist/esm/icons/party-popper'),
    Cake: () => import('lucide-react/dist/esm/icons/cake'),
    Coffee: () => import('lucide-react/dist/esm/icons/coffee'),
    Pizza: () => import('lucide-react/dist/esm/icons/pizza'),
    ShoppingCart: () => import('lucide-react/dist/esm/icons/shopping-cart'),
    ShoppingBag: () => import('lucide-react/dist/esm/icons/shopping-bag'),
    CreditCard: () => import('lucide-react/dist/esm/icons/credit-card'),
    Wallet: () => import('lucide-react/dist/esm/icons/wallet'),
    Banknote: () => import('lucide-react/dist/esm/icons/banknote'),
    Coins: () => import('lucide-react/dist/esm/icons/coins'),
    Calculator: () => import('lucide-react/dist/esm/icons/calculator'),
    Receipt: () => import('lucide-react/dist/esm/icons/receipt'),
    Building: () => import('lucide-react/dist/esm/icons/building'),
    Factory: () => import('lucide-react/dist/esm/icons/factory'),
    Store: () => import('lucide-react/dist/esm/icons/store'),
    Warehouse: () => import('lucide-react/dist/esm/icons/warehouse'),
    Plane: () => import('lucide-react/dist/esm/icons/plane'),
    Car: () => import('lucide-react/dist/esm/icons/car'),
    Bus: () => import('lucide-react/dist/esm/icons/bus'),
    Train: () => import('lucide-react/dist/esm/icons/train'),
    Bike: () => import('lucide-react/dist/esm/icons/bike'),
    Footprints: () => import('lucide-react/dist/esm/icons/footprints'),
    Fuel: () => import('lucide-react/dist/esm/icons/fuel'),
    Anchor: () => import('lucide-react/dist/esm/icons/anchor'),
    Ship: () => import('lucide-react/dist/esm/icons/ship'),
    Book: () => import('lucide-react/dist/esm/icons/book'),
    BookOpen: () => import('lucide-react/dist/esm/icons/book-open'),
    Bookmark2: () => import('lucide-react/dist/esm/icons/bookmark'),
    Library: () => import('lucide-react/dist/esm/icons/library'),
    GraduationCap: () => import('lucide-react/dist/esm/icons/graduation-cap'),
    School: () => import('lucide-react/dist/esm/icons/school'),
    Pencil: () => import('lucide-react/dist/esm/icons/pencil'),
    Pen: () => import('lucide-react/dist/esm/icons/pen-tool'),
    Eraser: () => import('lucide-react/dist/esm/icons/eraser'),
    Ruler: () => import('lucide-react/dist/esm/icons/ruler'),
    Target: () => import('lucide-react/dist/esm/icons/target'),
    Focus: () => import('lucide-react/dist/esm/icons/focus'),
    Crosshair: () => import('lucide-react/dist/esm/icons/crosshair'),
    Scan: () => import('lucide-react/dist/esm/icons/scan'),
    QrCode: () => import('lucide-react/dist/esm/icons/qr-code'),
    Fingerprint: () => import('lucide-react/dist/esm/icons/fingerprint'),
    MousePointer: () => import('lucide-react/dist/esm/icons/mouse-pointer'),
    Hand: () => import('lucide-react/dist/esm/icons/hand'),
    Gamepad: () => import('lucide-react/dist/esm/icons/gamepad-2'),
    Joystick: () => import('lucide-react/dist/esm/icons/joystick'),
    Dices: () => import('lucide-react/dist/esm/icons/dices'),
    Puzzle: () => import('lucide-react/dist/esm/icons/puzzle'),
    Music: () => import('lucide-react/dist/esm/icons/music'),
    Radio: () => import('lucide-react/dist/esm/icons/radio'),
    Headphones: () => import('lucide-react/dist/esm/icons/headphones'),
    Speaker: () => import('lucide-react/dist/esm/icons/speaker'),
    Theater: () => import('lucide-react/dist/esm/icons/theater'),
    Clapperboard: () => import('lucide-react/dist/esm/icons/clapperboard'),
    Tv: () => import('lucide-react/dist/esm/icons/tv'),
    Radio2: () => import('lucide-react/dist/esm/icons/radio'),
    Newspaper: () => import('lucide-react/dist/esm/icons/newspaper'),
    Rss: () => import('lucide-react/dist/esm/icons/rss'),
    Hash: () => import('lucide-react/dist/esm/icons/hash'),
    AtSign: () => import('lucide-react/dist/esm/icons/at-sign'),
    Percent: () => import('lucide-react/dist/esm/icons/percent'),
    Binary: () => import('lucide-react/dist/esm/icons/binary'),
    Code: () => import('lucide-react/dist/esm/icons/code'),
    Terminal: () => import('lucide-react/dist/esm/icons/terminal'),
    Command: () => import('lucide-react/dist/esm/icons/command'),
    Bug: () => import('lucide-react/dist/esm/icons/bug'),
    Wrench: () => import('lucide-react/dist/esm/icons/wrench'),
    Hammer: () => import('lucide-react/dist/esm/icons/hammer'),
    Screwdriver: () => import('lucide-react/dist/esm/icons/screwdriver'),
    Drill: () => import('lucide-react/dist/esm/icons/drill'),
    Pickaxe: () => import('lucide-react/dist/esm/icons/pickaxe'),
    Anvil: () => import('lucide-react/dist/esm/icons/anvil'),
    Cog: () => import('lucide-react/dist/esm/icons/cog'),
    Settings2: () => import('lucide-react/dist/esm/icons/settings-2'),
    Sliders: () => import('lucide-react/dist/esm/icons/sliders'),
    Gauge: () => import('lucide-react/dist/esm/icons/gauge'),
    Speedometer: () => import('lucide-react/dist/esm/icons/gauge'),
    Timer: () => import('lucide-react/dist/esm/icons/timer'),
    Stopwatch: () => import('lucide-react/dist/esm/icons/stopwatch'),
    AlarmClock: () => import('lucide-react/dist/esm/icons/alarm-clock'),
    Watch: () => import('lucide-react/dist/esm/icons/watch'),
    Hourglass: () => import('lucide-react/dist/esm/icons/hourglass'),
    Infinity: () => import('lucide-react/dist/esm/icons/infinity'),
    Recycle: () => import('lucide-react/dist/esm/icons/recycle'),
    Leaf: () => import('lucide-react/dist/esm/icons/leaf'),
    Flower: () => import('lucide-react/dist/esm/icons/flower'),
    Tree: () => import('lucide-react/dist/esm/icons/tree-pine'),
    Sprout: () => import('lucide-react/dist/esm/icons/sprout'),
    Heart2: () => import('lucide-react/dist/esm/icons/heart'),
    HeartHandshake: () => import('lucide-react/dist/esm/icons/heart-handshake'),
    Handshake: () => import('lucide-react/dist/esm/icons/handshake'),
    UserPlus: () => import('lucide-react/dist/esm/icons/user-plus'),
    UserMinus: () => import('lucide-react/dist/esm/icons/user-minus'),
    UserCheck: () => import('lucide-react/dist/esm/icons/user-check'),
    UserX: () => import('lucide-react/dist/esm/icons/user-x'),
    UserSearch: () => import('lucide-react/dist/esm/icons/user-search'),
    Users2: () => import('lucide-react/dist/esm/icons/users-2'),
    Crown: () => import('lucide-react/dist/esm/icons/crown'),
    Diamond: () => import('lucide-react/dist/esm/icons/diamond'),
    Gem: () => import('lucide-react/dist/esm/icons/gem'),
    Sparkles: () => import('lucide-react/dist/esm/icons/sparkles'),
    Wand: () => import('lucide-react/dist/esm/icons/wand-2'),
    Zap2: () => import('lucide-react/dist/esm/icons/zap'),
    Bolt: () => import('lucide-react/dist/esm/icons/bolt'),
    FlashLight: () => import('lucide-react/dist/esm/icons/flashlight'),
    Lightbulb: () => import('lucide-react/dist/esm/icons/lightbulb'),
    Candle: () => import('lucide-react/dist/esm/icons/candle'),
    Lamp: () => import('lucide-react/dist/esm/icons/lamp'),
  },

  // Framer Motion - import specific components
  motion: {
    div: () => import('framer-motion').then(mod => ({ motion: mod.motion })),
    span: () => import('framer-motion').then(mod => ({ motion: mod.motion })),
    button: () => import('framer-motion').then(mod => ({ motion: mod.motion })),
    AnimatePresence: () => import('framer-motion').then(mod => ({ AnimatePresence: mod.AnimatePresence })),
    useAnimation: () => import('framer-motion').then(mod => ({ useAnimation: mod.useAnimation })),
    useMotionValue: () => import('framer-motion').then(mod => ({ useMotionValue: mod.useMotionValue })),
    useTransform: () => import('framer-motion').then(mod => ({ useTransform: mod.useTransform })),
    useSpring: () => import('framer-motion').then(mod => ({ useSpring: mod.useSpring })),
    useInView: () => import('framer-motion').then(mod => ({ useInView: mod.useInView })),
    useDragControls: () => import('framer-motion').then(mod => ({ useDragControls: mod.useDragControls })),
    useAnimationControls: () => import('framer-motion').then(mod => ({ useAnimationControls: mod.useAnimationControls })),
  },

  // React Query - specific imports
  query: {
    useQuery: () => import('@tanstack/react-query').then(mod => ({ useQuery: mod.useQuery })),
    useMutation: () => import('@tanstack/react-query').then(mod => ({ useMutation: mod.useMutation })),
    useInfiniteQuery: () => import('@tanstack/react-query').then(mod => ({ useInfiniteQuery: mod.useInfiniteQuery })),
    useQueryClient: () => import('@tanstack/react-query').then(mod => ({ useQueryClient: mod.useQueryClient })),
    QueryClient: () => import('@tanstack/react-query').then(mod => ({ QueryClient: mod.QueryClient })),
    QueryClientProvider: () => import('@tanstack/react-query').then(mod => ({ QueryClientProvider: mod.QueryClientProvider })),
  }
};

// Performance utilities
export const performanceUtils = {
  // Measure component render time
  measureRenderTime: (componentName) => {
    return {
      start: () => {
        if (typeof window !== 'undefined' && window.performance) {
          window.performance.mark(`${componentName}-render-start`);
        }
      },
      end: () => {
        if (typeof window !== 'undefined' && window.performance) {
          window.performance.mark(`${componentName}-render-end`);
          window.performance.measure(
            `${componentName}-render-time`,
            `${componentName}-render-start`,
            `${componentName}-render-end`
          );
        }
      }
    };
  },

  // Lazy load images
  lazyLoadImage: (src, options = {}) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      
      // Progressive loading
      if (options.placeholder) {
        img.src = options.placeholder;
        setTimeout(() => {
          img.src = src;
        }, options.delay || 100);
      } else {
        img.src = src;
      }
    });
  },

  // Debounce function calls
  debounce: (func, delay = 300) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  // Throttle function calls
  throttle: (func, limit = 100) => {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Memory usage monitoring
  getMemoryUsage: () => {
    if (typeof window !== 'undefined' && window.performance?.memory) {
      return {
        used: Math.round(window.performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(window.performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(window.performance.memory.jsHeapSizeLimit / 1048576)
      };
    }
    return null;
  },

  // Bundle size analysis
  analyzeBundleSize: () => {
    if (typeof window !== 'undefined') {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      
      return {
        scripts: scripts.length,
        styles: styles.length,
        timestamp: new Date().toISOString()
      };
    }
    return null;
  }
};

// Resource hints for preloading
export const resourceHints = {
  preloadCriticalResources: () => {
    const criticalResources = [
      '/fonts/inter.woff2',
      '/api/user/profile',
      '/api/jobs?limit=5'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      if (resource.startsWith('/api/')) {
        link.as = 'fetch';
        link.crossOrigin = 'anonymous';
      } else if (resource.includes('.woff')) {
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
      }
      link.href = resource;
      document.head.appendChild(link);
    });
  },

  prefetchNextPage: (url) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  },

  preconnectToOrigins: () => {
    const origins = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://api.example.com'
    ];

    origins.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }
};

// Code splitting utilities
export const codeSplitting = {
  // Dynamic import with error handling
  dynamicImport: async (importPath, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await importPath();
      } catch (error) {
        if (i === retries - 1) throw error;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  },

  // Route-based code splitting
  loadRouteComponent: (route) => {
    const routeMap = {
      '/dashboard': () => import('../pages/Dashboard'),
      '/jobs': () => import('../pages/Jobs'),
      '/profile': () => import('../pages/Profile'),
      '/admin': () => import('../pages/Admin'),
      '/settings': () => import('../pages/Settings')
    };

    return routeMap[route] || (() => Promise.reject(new Error(`Route ${route} not found`)));
  },

  // Feature flag based loading
  loadFeature: async (featureName, isEnabled) => {
    if (!isEnabled) return null;

    const featureMap = {
      'video-calls': () => import('../features/VideoCall'),
      'advanced-analytics': () => import('../features/Analytics'),
      'real-time-chat': () => import('../features/Chat'),
      'file-sharing': () => import('../features/FileSharing'),
      'notifications': () => import('../features/Notifications')
    };

    const loader = featureMap[featureName];
    return loader ? await loader() : null;
  }
};

// Bundle analysis reporting
export const bundleAnalysis = {
  reportBundleMetrics: () => {
    if (typeof window === 'undefined') return;

    const metrics = {
      memory: performanceUtils.getMemoryUsage(),
      bundle: performanceUtils.analyzeBundleSize(),
      performance: {
        navigation: window.performance.getEntriesByType('navigation')[0],
        resources: window.performance.getEntriesByType('resource').length
      },
      timestamp: new Date().toISOString()
    };

    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'bundle_metrics', {
        custom_parameters: metrics
      });
    }

    return metrics;
  },

  // Track chunk loading
  trackChunkLoad: (chunkName, loadTime) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'chunk_loaded', {
        chunk_name: chunkName,
        load_time: loadTime,
        timestamp: Date.now()
      });
    }
  }
};

export default {
  optimizedImports,
  performanceUtils,
  resourceHints,
  codeSplitting,
  bundleAnalysis
};