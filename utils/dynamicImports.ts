import type { ComponentType } from 'react';

import { env } from '@/lib/env';

type ImportFactory<TModule> = () => Promise<TModule>;

export interface DynamicImportFallback<TModule> {
  load: () => Promise<TModule>;
  fallback: ComponentType;
}

const dynamicImportByPath = <TModule = unknown>(modulePath: string): Promise<TModule> => {
  return import(modulePath) as Promise<TModule>;
};

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

export const loadChartLibrary = () => importWithRetry(() => dynamicImportByPath('recharts'));
export const loadMapsLibrary = () =>
  importWithRetry(() => dynamicImportByPath('@react-google-maps/api'));
export const loadEditorLibrary = () => importWithRetry(() => dynamicImportByPath('react-quill'));
export const loadCarouselLibrary = () => importWithRetry(() => dynamicImportByPath('react-slick'));

export const loadRichTextEditor = () =>
  importWithRetry(() => dynamicImportByPath('../components/ui/RichTextEditor'));
export const loadImageCropper = () =>
  importWithRetry(() => dynamicImportByPath('../components/ui/ImageCropper'));
export const loadAdvancedDataTable = () =>
  importWithRetry(() => dynamicImportByPath('../components/ui/AdvancedDataTable'));
export const loadMapComponent = () =>
  importWithRetry(() => dynamicImportByPath('../components/ui/MapComponent'));

export const loadAnalytics = async () => {
  if (typeof window !== 'undefined' && env.NODE_ENV === 'production') {
    return importWithRetry(() => dynamicImportByPath('react-ga4'));
  }
  return null;
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
  dynamicImportWithFallback,
  preloadComponent,
};
