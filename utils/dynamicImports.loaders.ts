import { env } from '@/lib/env';

import { importWithRetry } from './dynamicImports';

const dynamicImportByPath = <TModule = unknown>(modulePath: string): Promise<TModule> => {
  return import(modulePath) as Promise<TModule>;
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
