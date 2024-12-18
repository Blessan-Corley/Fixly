'use client';

/**
 * Dynamic Component Loader with Error Boundary and Fallback
 */

import { lazy, Suspense, Component } from 'react';

// Error boundary wrapper for dynamic components
class DynamicErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dynamic component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Failed to load component</div>;
    }

    return this.props.children;
  }
}

// Dynamic loader with retry and error handling
export const createDynamicLoader = (importFunction, options = {}) => {
  const { fallback, maxRetries = 3, delay = 1000 } = options;

  // Lazy load the component with retry logic
  const LazyComponent = lazy(async () => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const module = await importFunction();
        return { default: module.default };
      } catch (error) {
        console.warn(`Dynamic import attempt ${i + 1} failed:`, error);
        
        if (i === maxRetries - 1) {
          console.error('Dynamic import failed after all retries:', error);
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  });

  // Return a component that wraps the lazy component with error boundary and suspense
  return (props) => (
    <DynamicErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback || <div className="loading-spinner">Loading...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    </DynamicErrorBoundary>
  );
};

// Common dynamic components
export const DynamicRichTextEditor = createDynamicLoader(
  () => import('../components/ui/RichTextEditor'),
  { fallback: <div className="p-4 text-center text-gray-500">Loading editor...</div> }
);

export const DynamicMapComponent = createDynamicLoader(
  () => import('../components/ui/MapComponent'),
  { fallback: <div className="p-4 text-center text-gray-500">Loading map...</div> }
);

export const DynamicChartComponent = createDynamicLoader(
  () => import('../components/ui/ChartComponent'),
  { fallback: <div className="p-4 text-center text-gray-500">Loading chart...</div> }
);

export const DynamicImageCropper = createDynamicLoader(
  () => import('../components/ui/ImageCropper'),
  { fallback: <div className="p-4 text-center text-gray-500">Loading image editor...</div> }
);

export const DynamicDataTable = createDynamicLoader(
  () => import('../components/ui/DataTable'),
  { fallback: <div className="p-4 text-center text-gray-500">Loading data table...</div> }
);

// Utility function to dynamically import and use components
export const loadAndRender = async (importFunction, props, fallback) => {
  try {
    const module = await importFunction();
    const Component = module.default;
    return <Component {...props} />;
  } catch (error) {
    console.error('Failed to load dynamic component:', error);
    return fallback || <div>Failed to load component</div>;
  }
};

export default {
  createDynamicLoader,
  DynamicRichTextEditor,
  DynamicMapComponent,
  DynamicChartComponent,
  DynamicImageCropper,
  DynamicDataTable,
  loadAndRender
};