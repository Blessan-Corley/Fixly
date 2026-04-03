const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getPagination = (value: unknown): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;
  return isRecord(value.pagination) ? value.pagination : null;
};

export const getHasMore = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (typeof value.hasMore === 'boolean') return value.hasMore;
  const pagination = getPagination(value);
  return pagination?.hasMore === true;
};

export const getCurrentPage = (value: unknown): number => {
  if (!isRecord(value)) return 1;
  if (typeof value.currentPage === 'number' && Number.isFinite(value.currentPage)) {
    return value.currentPage;
  }
  const pagination = getPagination(value);
  if (pagination && typeof pagination.page === 'number' && Number.isFinite(pagination.page)) {
    return pagination.page;
  }
  return 1;
};

export const getMutationJobId = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  if (typeof value._id === 'string' && value._id) return value._id;
  if (typeof value.jobId === 'string' && value.jobId) return value.jobId;
  return null;
};

export type ApplyPayload = {
  jobId: string;
  applicationData: {
    message?: string;
    bidAmount?: number;
    [key: string]: unknown;
  };
};

export type ApplyMutateContext = {
  jobId: string;
  optimisticApplication: {
    _id: string;
    fixer: unknown;
    message?: string;
    bidAmount?: number;
    createdAt: string;
    status: string;
  };
};
