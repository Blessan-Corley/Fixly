import {
  acceptApplicationOnJob,
  canApplyToJob,
  confirmCompletionOnJob,
  countActiveApplicationsOnJob,
  markDoneOnJob,
  raiseDisputeOnJob,
  withdrawApplicationOnJob,
  type WorkflowApplication,
  type WorkflowJob,
  type ObjectIdLike,
} from '@/models/job/workflow';

type WorkflowApplicationsArray = WorkflowApplication[] & {
  id: (id: ObjectIdLike) => WorkflowApplication | null | undefined;
};

function createApplications(entries: WorkflowApplication[]): WorkflowApplicationsArray {
  const applications = [...entries] as WorkflowApplicationsArray;
  applications.id = (id: ObjectIdLike) =>
    applications.find((application) => String(application._id) === String(id));

  return applications;
}

function createJob(overrides: Partial<WorkflowJob> = {}): WorkflowJob {
  return {
    createdBy: 'hirer-1',
    assignedTo: null,
    status: 'open',
    applications: createApplications([]),
    progress: {},
    completion: {},
    cancellation: {},
    dispute: {},
    ...overrides,
  };
}

describe('job workflow helpers', () => {
  it('prevents applying when the fixer already has a non-withdrawn application', () => {
    const job = createJob({
      applications: createApplications([{ _id: 'app-1', fixer: 'fixer-1', status: 'pending' }]),
    });

    expect(canApplyToJob(job, 'fixer-1')).toBe(false);
  });

  it('allows reapplying after a withdrawn application', () => {
    const job = createJob({
      applications: createApplications([{ _id: 'app-1', fixer: 'fixer-1', status: 'withdrawn' }]),
    });

    expect(canApplyToJob(job, 'fixer-1')).toBe(true);
  });

  it('counts only non-withdrawn applications as active', () => {
    const count = countActiveApplicationsOnJob({
      applications: [{ status: 'pending' }, { status: 'accepted' }, { status: 'withdrawn' }],
    });

    expect(count).toBe(2);
  });

  it('accepts one application, assigns the fixer, and rejects other pending applications', () => {
    const job = createJob({
      applications: createApplications([
        { _id: 'app-1', fixer: 'fixer-1', status: 'pending' },
        { _id: 'app-2', fixer: 'fixer-2', status: 'pending' },
        { _id: 'app-3', fixer: 'fixer-3', status: 'withdrawn' },
      ]),
    });
    const startedAt = new Date('2026-02-28T10:00:00.000Z');

    const result = acceptApplicationOnJob(job, 'app-2', startedAt);

    expect(result.ok).toBe(true);
    expect(job.status).toBe('in_progress');
    expect(String(job.assignedTo)).toBe('fixer-2');
    expect(job.progress.startedAt).toEqual(startedAt);
    expect(job.applications.find((application) => application._id === 'app-1')?.status).toBe(
      'rejected'
    );
    expect(job.applications.find((application) => application._id === 'app-2')?.status).toBe(
      'accepted'
    );
    expect(job.applications.find((application) => application._id === 'app-3')?.status).toBe(
      'withdrawn'
    );
  });

  it('withdraws only pending applications', () => {
    const job = createJob({
      applications: createApplications([
        { _id: 'app-1', fixer: 'fixer-1', status: 'accepted' },
        { _id: 'app-2', fixer: 'fixer-2', status: 'pending' },
      ]),
    });

    const missingResult = withdrawApplicationOnJob(job, 'fixer-1');
    const successResult = withdrawApplicationOnJob(job, 'fixer-2');

    expect(missingResult).toEqual({ ok: false, code: 'pending_application_not_found' });
    expect(successResult.ok).toBe(true);
    expect(job.applications.find((application) => application._id === 'app-2')?.status).toBe(
      'withdrawn'
    );
  });

  it('marks an in-progress job done and stores completion details', () => {
    const completedAt = new Date('2026-02-28T12:00:00.000Z');
    const job = createJob({
      status: 'in_progress',
      assignedTo: 'fixer-1',
    });

    const result = markDoneOnJob(
      job,
      'fixer-1',
      'Finished the repair',
      ['after-1.jpg'],
      completedAt
    );

    expect(result.ok).toBe(true);
    expect(job.status).toBe('completed');
    expect(job.progress.completedAt).toEqual(completedAt);
    expect(job.completion.markedDoneBy).toBe('fixer-1');
    expect(job.completion.completionNotes).toBe('Finished the repair');
    expect(job.completion.afterImages).toEqual(['after-1.jpg']);
  });

  it('requires the hirer to confirm completion after the job is completed', () => {
    const job = createJob({
      status: 'completed',
      assignedTo: 'fixer-1',
    });

    const forbiddenResult = confirmCompletionOnJob(job, 'fixer-1', 5, 'Great work');
    const successResult = confirmCompletionOnJob(job, 'hirer-1', 5, 'Great work');

    expect(forbiddenResult).toEqual({ ok: false, code: 'not_job_creator' });
    expect(successResult.ok).toBe(true);
    expect(job.completion.confirmedBy).toBe('hirer-1');
    expect(job.completion.rating).toBe(5);
    expect(job.completion.review).toBe('Great work');
  });

  it('allows only job participants to raise a dispute', () => {
    const createdAt = new Date('2026-02-28T13:00:00.000Z');
    const job = createJob({
      status: 'completed',
      assignedTo: 'fixer-9',
    });

    const outsiderResult = raiseDisputeOnJob(job, 'outsider-1', 'quality', 'Not acceptable');
    const participantResult = raiseDisputeOnJob(
      job,
      'fixer-9',
      'quality',
      'Not acceptable',
      ['photo-1.jpg'],
      createdAt
    );

    expect(outsiderResult).toEqual({ ok: false, code: 'not_participant' });
    expect(participantResult.ok).toBe(true);
    expect(job.status).toBe('disputed');
    expect(job.dispute.raisedBy).toBe('fixer-9');
    expect(job.dispute.evidence).toEqual(['photo-1.jpg']);
    expect(job.dispute.createdAt).toEqual(createdAt);
  });
});
