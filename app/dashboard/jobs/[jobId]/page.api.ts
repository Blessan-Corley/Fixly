import type { JobApplicationFormData, RatingFormData } from './page.helpers';
import type {
  ApplicationsResponse,
  CommentsResponse,
  DeleteReplyPayload,
  GenericResponse,
  JobActionRequestBody,
  JobDetailsResponse,
  ReplyLikePayload,
} from './page.types';

type ApiResult<T> = {
  ok: boolean;
  data: T;
};

type CommentPayload = {
  message: string;
};

type ReplyPayload = {
  commentId: string;
  message: string;
};

type QuickApplyPayload = {
  proposedAmount: number;
  coverLetter: string;
};

const createJsonRequestInit = (
  method: 'POST' | 'PUT' | 'DELETE',
  signal: AbortSignal,
  body?: object
): RequestInit => ({
  method,
  headers: body ? { 'Content-Type': 'application/json' } : undefined,
  body: body ? JSON.stringify(body) : undefined,
  signal,
});

const requestJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResult<T>> => {
  const response = await fetch(input, init);
  const data = (await response.json()) as T;

  return {
    ok: response.ok,
    data,
  };
};

export const fetchJobDetailsRequest = (
  jobId: string,
  signal: AbortSignal
): Promise<ApiResult<JobDetailsResponse>> =>
  requestJson<JobDetailsResponse>(`/api/jobs/${jobId}`, { signal });

export const trackJobViewRequest = async (jobId: string, signal: AbortSignal): Promise<void> => {
  await fetch(`/api/jobs/${jobId}/view`, {
    method: 'POST',
    signal,
  });
};

export const fetchApplicationsRequest = (
  jobId: string,
  signal: AbortSignal
): Promise<ApiResult<ApplicationsResponse>> =>
  requestJson<ApplicationsResponse>(`/api/jobs/${jobId}/apply`, { signal });

export const fetchCommentsRequest = (
  jobId: string,
  signal: AbortSignal
): Promise<ApiResult<CommentsResponse>> =>
  requestJson<CommentsResponse>(`/api/jobs/${jobId}/comments`, { signal });

export const submitQuickApplicationRequest = (
  jobId: string,
  payload: QuickApplyPayload,
  signal: AbortSignal
): Promise<ApiResult<GenericResponse>> =>
  requestJson<GenericResponse>(
    `/api/jobs/${jobId}/apply`,
    createJsonRequestInit('POST', signal, payload)
  );

export const submitDetailedApplicationRequest = (
  jobId: string,
  payload: JobApplicationFormData,
  signal: AbortSignal
): Promise<ApiResult<GenericResponse>> =>
  requestJson<GenericResponse>(
    `/api/jobs/${jobId}/apply`,
    createJsonRequestInit('POST', signal, payload)
  );

export const updateJobActionRequest = (
  jobId: string,
  payload: JobActionRequestBody,
  signal: AbortSignal
): Promise<ApiResult<GenericResponse>> =>
  requestJson<GenericResponse>(`/api/jobs/${jobId}`, createJsonRequestInit('PUT', signal, payload));

export const submitRatingRequest = (
  jobId: string,
  payload: RatingFormData & { ratedBy: string },
  signal: AbortSignal
): Promise<ApiResult<GenericResponse>> =>
  requestJson<GenericResponse>(
    `/api/jobs/${jobId}/rating`,
    createJsonRequestInit('POST', signal, payload)
  );

export const addCommentRequest = (
  jobId: string,
  payload: CommentPayload,
  signal: AbortSignal
): Promise<ApiResult<GenericResponse>> =>
  requestJson<GenericResponse>(
    `/api/jobs/${jobId}/comments`,
    createJsonRequestInit('POST', signal, payload)
  );

export const addReplyRequest = (
  jobId: string,
  payload: ReplyPayload,
  signal: AbortSignal
): Promise<ApiResult<GenericResponse>> =>
  requestJson<GenericResponse>(
    `/api/jobs/${jobId}/comments`,
    createJsonRequestInit('PUT', signal, payload)
  );

export const likeCommentRequest = (
  jobId: string,
  commentId: string,
  signal: AbortSignal
): Promise<ApiResult<GenericResponse>> =>
  requestJson<GenericResponse>(`/api/jobs/${jobId}/comments/${commentId}/like`, {
    method: 'POST',
    signal,
  });

export const likeReplyRequest = (
  jobId: string,
  commentId: string,
  payload: ReplyLikePayload,
  signal: AbortSignal
): Promise<ApiResult<GenericResponse>> =>
  requestJson<GenericResponse>(
    `/api/jobs/${jobId}/comments/${commentId}/like`,
    createJsonRequestInit('POST', signal, payload)
  );

export const deleteCommentRequest = (
  jobId: string,
  commentId: string,
  signal: AbortSignal
): Promise<ApiResult<GenericResponse>> =>
  requestJson<GenericResponse>(`/api/jobs/${jobId}/comments/${commentId}`, {
    method: 'DELETE',
    signal,
  });

export const deleteReplyRequest = (
  jobId: string,
  payload: DeleteReplyPayload,
  signal: AbortSignal
): Promise<ApiResult<GenericResponse>> =>
  requestJson<GenericResponse>(
    `/api/jobs/${jobId}/comments`,
    createJsonRequestInit('DELETE', signal, payload)
  );
