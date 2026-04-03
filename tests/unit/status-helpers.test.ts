import { vi } from 'vitest';
vi.mock('@/lib/ably', () => ({
  CHANNELS: {
    jobUpdates: vi.fn((jobId: string) => `job:${jobId}:updates`),
  },
  EVENTS: {
    JOB_STATUS_CHANGED: 'job_status_changed',
  },
  getServerAbly: vi.fn(() => null),
}));

vi.mock('@/app/api/jobs/[jobId]/job-route-utils', () => ({
  sanitizeString: (value: unknown) => (typeof value === 'string' ? value.trim() : ''),
  toIdString: (value: unknown) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (
      typeof value === 'object' &&
      value !== null &&
      '_id' in (value as Record<string, unknown>)
    ) {
      return String((value as Record<string, unknown>)._id);
    }
    return String(value);
  },
}));

import {
  buildStatusHistory,
  getAvailableActions,
  parseStatus,
  publishJobStatusUpdate,
  type JobStatusEntity,
} from '@/app/api/jobs/[jobId]/status/status-helpers';
import { getServerAbly } from '@/lib/ably';

describe('status-helpers', () => {
  it('parses valid statuses and rejects invalid input', () => {
    expect(parseStatus('completed')).toBe('completed');
    expect(parseStatus('invalid')).toBeNull();
    expect(parseStatus(undefined)).toBeNull();
  });

  it('builds chronological status history from job state', () => {
    const job: JobStatusEntity = {
      status: 'completed',
      createdAt: '2025-01-01T10:00:00.000Z',
      updatedAt: '2025-01-01T13:00:00.000Z',
      createdBy: 'hirer-1',
      assignedTo: 'fixer-1',
      applications: [],
      progress: {
        startedAt: '2025-01-01T11:00:00.000Z',
        completedAt: '2025-01-01T12:00:00.000Z',
      },
      completion: {
        markedDoneBy: 'fixer-1',
      },
    };

    const history = buildStatusHistory(job);

    expect(history.map((entry) => entry.status)).toEqual(['open', 'in_progress', 'completed']);
    expect(history[0]?.action).toBe('created');
    expect(history[2]?.actor).toBe('fixer-1');
  });

  it('returns correct available actions for hirer and fixer roles', () => {
    const inProgressJob: JobStatusEntity = {
      status: 'in_progress',
      createdBy: 'hirer-1',
      assignedTo: 'fixer-1',
      applications: [],
    };

    expect(getAvailableActions(inProgressJob, true, false, false)).toEqual([
      { action: 'cancelled', label: 'Cancel Job', requiresData: ['reason'] },
      { action: 'disputed', label: 'Raise Dispute', requiresData: ['disputeReason'] },
    ]);

    expect(getAvailableActions(inProgressJob, false, true, false)).toEqual([
      { action: 'completed', label: 'Mark Completed', requiresData: ['completionNotes'] },
      { action: 'disputed', label: 'Raise Dispute', requiresData: ['disputeReason'] },
    ]);
  });

  it('publishes status updates when Ably is available', async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    (getServerAbly as jest.Mock).mockReturnValue({
      channels: {
        get: vi.fn(() => ({ publish })),
      },
    });

    await publishJobStatusUpdate('job-1', { jobId: 'job-1', newStatus: 'completed' });

    expect(publish).toHaveBeenCalledWith('job_status_changed', {
      jobId: 'job-1',
      newStatus: 'completed',
    });
  });
});
