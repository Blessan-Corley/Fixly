import type { ComponentType } from 'react';

type ImportFactory<TModule> = () => Promise<TModule>;

export interface DynamicImportFallback<TModule> {
  load: () => Promise<TModule>;
  fallback: ComponentType;
}

export const importWithRetry = async <TModule>(
  importFunction: ImportFactory<TModule>,
  maxRetries = 3
): Promise<TModule> => {
  const retries = Number.isInteger(maxRetries) && maxRetries > 0 ? maxRetries : 1;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await importFunction();
    } catch (error) {
      if (attempt === retries - 1) {
        console.error('Failed to import module after retries:', error);
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 1000 * (attempt + 1));
      });
    }
  }

  throw new Error('Unreachable import retry state');
};

export const dynamicImportWithFallback = <TModule>(
  importFunction: ImportFactory<TModule>,
  fallbackComponent?: ComponentType
): DynamicImportFallback<TModule> => {
  const EmptyFallback: ComponentType = () => null;

  return {
    load: () => importWithRetry(importFunction),
    fallback: fallbackComponent ?? EmptyFallback,
  };
};

export const preloadComponent = async <TModule>(
  importFunction: ImportFactory<TModule>
): Promise<TModule | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  if ('requestIdleCallback' in window) {
    return new Promise((resolve) => {
      window.requestIdleCallback(async () => {
        try {
          const component = await importWithRetry(importFunction);
          resolve(component);
        } catch (error) {
          console.warn('Component preload failed:', error);
          resolve(null);
        }
      });
    });
  }

  try {
    return await importWithRetry(importFunction);
  } catch (error) {
    console.warn('Component preload failed:', error);
    return null;
  }
};

// Re-export library loaders for convenience
export {
  loadChartLibrary,
  loadMapsLibrary,
  loadEditorLibrary,
  loadCarouselLibrary,
  loadRichTextEditor,
  loadImageCropper,
  loadAdvancedDataTable,
  loadMapComponent,
  loadAnalytics,
} from './dynamicImports.loaders';

export default {
  importWithRetry,
  dynamicImportWithFallback,
  preloadComponent,
};
