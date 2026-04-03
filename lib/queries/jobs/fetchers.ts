type QueryFilters = Record<string, unknown>;
type QueryResponse = Record<string, unknown>;

export function toSearchParams(filters: Record<string, unknown> = {}): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null && entry !== '') {
          params.append(key, String(entry));
        }
      });
      return;
    }

    params.set(key, String(value));
  });

  return params;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchJson(url: string, init?: RequestInit): Promise<QueryResponse> {
  const response = await fetch(url, init);
  const payload = await readJson(response);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : payload &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof payload.error === 'string'
          ? payload.error
          : 'Request failed';
    throw new Error(message);
  }

  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as QueryResponse)
    : {};
}

export async function fetchJobs(filters: QueryFilters = {}): Promise<QueryResponse> {
  const params = toSearchParams(filters);
  return fetchJson(`/api/jobs/browse?${params.toString()}`);
}

export async function fetchJobDetail(jobId: string): Promise<QueryResponse> {
  return fetchJson(`/api/jobs/${jobId}`);
}

export async function fetchJobApplications(jobId: string): Promise<QueryResponse> {
  return fetchJson(`/api/jobs/${jobId}/applications`);
}

export async function fetchJobReviews(jobId: string): Promise<QueryResponse> {
  return fetchJson(`/api/jobs/${jobId}/reviews`);
}

export async function fetchBrowseJobs(filters: QueryFilters = {}): Promise<QueryResponse> {
  const params = toSearchParams(filters);
  return fetchJson(`/api/jobs/browse?${params.toString()}`);
}

export async function fetchSavedJobs(): Promise<QueryResponse> {
  return fetchJson('/api/jobs/saved');
}
