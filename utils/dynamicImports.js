// utils/dynamicImports.js

/**
 * Utility functions for dynamic imports to optimize bundle size
 */

// Dynamic import for heavy components
export const importWithRetry = async (importFunction, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await importFunction();
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error('Failed to import module after retries:', error);
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// Lazy load heavy libraries only when needed
export const loadChartLibrary = () => importWithRetry(() => import('recharts'));
export const loadMapsLibrary = () => importWithRetry(() => import('@react-google-maps/api'));
export const loadEditorLibrary = () => importWithRetry(() => import('react-quill'));
export const loadCarouselLibrary = () => importWithRetry(() => import('react-slick'));

// Lazy load heavy UI components
export const loadRichTextEditor = () => importWithRetry(() => import('../components/ui/RichTextEditor'));
export const loadImageCropper = () => importWithRetry(() => import('../components/ui/ImageCropper'));
export const loadAdvancedDataTable = () => importWithRetry(() => import('../components/ui/AdvancedDataTable'));
export const loadMapComponent = () => importWithRetry(() => import('../components/ui/MapComponent'));

// Lazy load analytics and tracking tools conditionally
export const loadAnalytics = async () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    return importWithRetry(() => import('react-ga4'));
  }
  return null;
};

// Lazy load payment libraries only when needed
export const loadRazorpay = () => {
  if (typeof window !== 'undefined') {
    return importWithRetry(() => import('razorpay'));
  }
  return Promise.resolve(null);
};

// Dynamic import with loading and error boundaries
export const dynamicImportWithFallback = (importFunction, fallbackComponent) => {
  // We'll use React's lazy and suspense in the component that uses this
  return {
    load: () => importWithRetry(importFunction),
    fallback: fallbackComponent || (() => <div>Loading...</div>)
  };
};

// Preload critical components when idle
export const preloadComponent = async (importFunction) => {
  if ('requestIdleCallback' in window) {
    return new Promise((resolve) => {
      requestIdleCallback(async () => {
        try {
          const component = await importWithRetry(importFunction);
          resolve(component);
        } catch (error) {
          console.warn('Component preload failed:', error);
          resolve(null);
        }
      });
    });
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    return importWithRetry(importFunction);
  }
};

export default {
  importWithRetry,
  loadChartLibrary,
  loadMapsLibrary,
  loadEditorLibrary,
  loadCarouselLibrary,
  loadRichTextEditor,
  loadImageCropper,
  loadAdvancedDataTable,
  loadMapComponent,
  loadAnalytics,
  loadRazorpay,
  dynamicImportWithFallback,
  preloadComponent
};