// Comprehensive Responsive Layout System
'use client';
import React, { useState, useEffect, createContext, useContext } from 'react';

// Screen breakpoints
const BREAKPOINTS = {
  xs: 320,   // Extra small devices (phones, portrait)
  sm: 576,   // Small devices (phones, landscape)
  md: 768,   // Medium devices (tablets, portrait)
  lg: 992,   // Large devices (tablets, landscape & small desktops)
  xl: 1200,  // Extra large devices (large desktops)
  xxl: 1400  // Extra extra large devices (larger desktops)
};

// Create responsive context
const ResponsiveContext = createContext();

export const useResponsive = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsive must be used within ResponsiveProvider');
  }
  return context;
};

// Responsive Provider Component
export const ResponsiveProvider = ({ children }) => {
  const [screenSize, setScreenSize] = useState('lg');
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [orientation, setOrientation] = useState('landscape');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [pixelRatio, setPixelRatio] = useState(1);

  useEffect(() => {
    const updateResponsiveData = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDimensions({ width, height });
      setOrientation(width > height ? 'landscape' : 'portrait');
      setPixelRatio(window.devicePixelRatio || 1);

      // Determine screen size
      let newScreenSize = 'xs';
      if (width >= BREAKPOINTS.xxl) newScreenSize = 'xxl';
      else if (width >= BREAKPOINTS.xl) newScreenSize = 'xl';
      else if (width >= BREAKPOINTS.lg) newScreenSize = 'lg';
      else if (width >= BREAKPOINTS.md) newScreenSize = 'md';
      else if (width >= BREAKPOINTS.sm) newScreenSize = 'sm';
      
      setScreenSize(newScreenSize);

      // Detect touch device
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    updateResponsiveData();

    const debouncedUpdate = debounce(updateResponsiveData, 100);
    window.addEventListener('resize', debouncedUpdate);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateResponsiveData, 100); // Delay for orientation change
    });

    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      window.removeEventListener('orientationchange', updateResponsiveData);
    };
  }, []);

  // Utility functions
  const isMobile = () => screenSize === 'xs' || screenSize === 'sm';
  const isTablet = () => screenSize === 'md';
  const isDesktop = () => screenSize === 'lg' || screenSize === 'xl' || screenSize === 'xxl';
  
  const isSmallScreen = () => dimensions.width < BREAKPOINTS.md;
  const isMediumScreen = () => dimensions.width >= BREAKPOINTS.md && dimensions.width < BREAKPOINTS.lg;
  const isLargeScreen = () => dimensions.width >= BREAKPOINTS.lg;

  const value = {
    screenSize,
    dimensions,
    orientation,
    isTouchDevice,
    pixelRatio,
    breakpoints: BREAKPOINTS,
    
    // Utility functions
    isMobile: isMobile(),
    isTablet: isTablet(),
    isDesktop: isDesktop(),
    isSmallScreen: isSmallScreen(),
    isMediumScreen: isMediumScreen(),
    isLargeScreen: isLargeScreen(),
    
    // Helper functions
    showOn: (sizes) => {
      if (typeof sizes === 'string') sizes = [sizes];
      return sizes.includes(screenSize);
    },
    hideOn: (sizes) => {
      if (typeof sizes === 'string') sizes = [sizes];
      return !sizes.includes(screenSize);
    }
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
};

// Responsive Grid System
export const ResponsiveGrid = ({ children, className = '', ...props }) => {
  const { isMobile, isTablet } = useResponsive();
  
  const gridClass = `
    grid gap-4
    ${isMobile ? 'grid-cols-1' : ''}
    ${isTablet ? 'grid-cols-2' : ''}
    ${!isMobile && !isTablet ? 'grid-cols-3 lg:grid-cols-4' : ''}
    ${className}
  `;

  return (
    <div className={gridClass} {...props}>
      {children}
    </div>
  );
};

// Responsive Container
export const ResponsiveContainer = ({ children, className = '', fluid = false, ...props }) => {
  const { screenSize } = useResponsive();
  
  const containerClass = `
    mx-auto px-4
    ${!fluid ? `
      ${screenSize === 'xs' || screenSize === 'sm' ? 'max-w-full' : ''}
      ${screenSize === 'md' ? 'max-w-3xl' : ''}
      ${screenSize === 'lg' ? 'max-w-5xl' : ''}
      ${screenSize === 'xl' ? 'max-w-6xl' : ''}
      ${screenSize === 'xxl' ? 'max-w-7xl' : ''}
    ` : 'w-full'}
    ${className}
  `;

  return (
    <div className={containerClass} {...props}>
      {children}
    </div>
  );
};

// Responsive Show/Hide Component
export const ResponsiveDisplay = ({ show, hide, children }) => {
  const { screenSize } = useResponsive();
  
  if (show && !show.includes(screenSize)) return null;
  if (hide && hide.includes(screenSize)) return null;
  
  return children;
};

// Responsive Navigation
export const ResponsiveNavigation = ({ children, className = '' }) => {
  const { isMobile, isDesktop } = useResponsive();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className={`relative ${className}`}>
      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-lg"
          aria-label="Toggle navigation"
        >
          <div className={`w-6 h-0.5 bg-gray-600 transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
          <div className={`w-6 h-0.5 bg-gray-600 transition-all duration-300 mt-1 ${isOpen ? 'opacity-0' : ''}`} />
          <div className={`w-6 h-0.5 bg-gray-600 transition-all duration-300 mt-1 ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </button>
      )}

      {/* Navigation content */}
      <div className={`
        ${isMobile ? `
          fixed inset-0 bg-white z-40 transform transition-transform duration-300
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          overflow-y-auto pt-16
        ` : 'relative'}
      `}>
        {React.cloneElement(children, { 
          isMobile, 
          isDesktop, 
          closeMenu: () => setIsOpen(false) 
        })}
      </div>

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </nav>
  );
};

// Responsive Card Component
export const ResponsiveCard = ({ 
  children, 
  className = '', 
  padding = 'default',
  hover = true,
  ...props 
}) => {
  const { isMobile, screenSize } = useResponsive();
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    default: isMobile ? 'p-4' : 'p-6',
    lg: isMobile ? 'p-6' : 'p-8'
  };

  const cardClass = `
    bg-white rounded-lg shadow-sm border border-gray-200
    ${hover ? 'hover:shadow-md transition-shadow duration-200' : ''}
    ${paddingClasses[padding]}
    ${isMobile ? 'rounded-lg' : 'rounded-xl'}
    ${className}
  `;

  return (
    <div className={cardClass} {...props}>
      {children}
    </div>
  );
};

// Responsive Text Component
export const ResponsiveText = ({ 
  children, 
  variant = 'body',
  className = '',
  ...props 
}) => {
  const { screenSize } = useResponsive();
  
  const variantClasses = {
    h1: {
      xs: 'text-2xl font-bold',
      sm: 'text-3xl font-bold',
      md: 'text-4xl font-bold',
      lg: 'text-5xl font-bold',
      xl: 'text-6xl font-bold',
      xxl: 'text-7xl font-bold'
    },
    h2: {
      xs: 'text-xl font-semibold',
      sm: 'text-2xl font-semibold',
      md: 'text-3xl font-semibold',
      lg: 'text-4xl font-semibold',
      xl: 'text-5xl font-semibold',
      xxl: 'text-6xl font-semibold'
    },
    h3: {
      xs: 'text-lg font-medium',
      sm: 'text-xl font-medium',
      md: 'text-2xl font-medium',
      lg: 'text-3xl font-medium',
      xl: 'text-4xl font-medium',
      xxl: 'text-5xl font-medium'
    },
    body: {
      xs: 'text-sm',
      sm: 'text-base',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-lg',
      xxl: 'text-xl'
    },
    caption: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-base',
      xxl: 'text-lg'
    }
  };

  const textClass = `${variantClasses[variant][screenSize]} ${className}`;

  const Component = variant.startsWith('h') ? variant : 'p';

  return React.createElement(Component, { className: textClass, ...props }, children);
};

// Responsive Button Component
export const ResponsiveButton = ({ 
  children, 
  size = 'default',
  className = '',
  ...props 
}) => {
  const { isMobile, isTouchDevice } = useResponsive();
  
  const sizeClasses = {
    sm: isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-sm',
    default: isMobile ? 'px-4 py-3 text-base' : 'px-6 py-3 text-base',
    lg: isMobile ? 'px-6 py-4 text-lg' : 'px-8 py-4 text-lg'
  };

  const touchOptimized = isTouchDevice ? 'min-h-[44px] min-w-[44px]' : '';

  const buttonClass = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${touchOptimized}
    ${className}
  `;

  return (
    <button className={buttonClass} {...props}>
      {children}
    </button>
  );
};

// Responsive Modal
export const ResponsiveModal = ({ 
  isOpen, 
  onClose, 
  children, 
  title,
  size = 'default',
  className = ''
}) => {
  const { isMobile, screenSize } = useResponsive();

  if (!isOpen) return null;

  const sizeClasses = {
    sm: isMobile ? 'max-w-sm' : 'max-w-md',
    default: isMobile ? 'max-w-lg' : 'max-w-xl',
    lg: isMobile ? 'max-w-xl' : 'max-w-4xl',
    full: 'max-w-full'
  };

  const modalClass = `
    fixed inset-0 z-50 flex items-center justify-center p-4
    ${isMobile ? 'items-end sm:items-center' : ''}
  `;

  const contentClass = `
    relative bg-white rounded-lg shadow-xl w-full
    ${sizeClasses[size]}
    ${isMobile ? 'rounded-t-xl rounded-b-none sm:rounded-xl max-h-[90vh]' : 'max-h-[80vh]'}
    overflow-hidden
    ${className}
  `;

  return (
    <div className={modalClass}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className={contentClass}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="overflow-y-auto max-h-full">
          {children}
        </div>
      </div>
    </div>
  );
};

// Responsive Layout Hook for custom components
export const useResponsiveLayout = () => {
  const responsive = useResponsive();
  
  return {
    ...responsive,
    
    // Layout utilities
    getColumns: (options = {}) => {
      const { mobile = 1, tablet = 2, desktop = 3, large = 4 } = options;
      
      if (responsive.isMobile) return mobile;
      if (responsive.isTablet) return tablet;
      if (responsive.screenSize === 'lg') return desktop;
      return large;
    },
    
    getSpacing: (options = {}) => {
      const { mobile = '16px', tablet = '24px', desktop = '32px' } = options;
      
      if (responsive.isMobile) return mobile;
      if (responsive.isTablet) return tablet;
      return desktop;
    },
    
    getFontSize: (base = 16) => {
      const multipliers = { xs: 0.875, sm: 0.9, md: 1, lg: 1.1, xl: 1.125, xxl: 1.25 };
      return base * multipliers[responsive.screenSize];
    }
  };
};

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default ResponsiveProvider;