import type {
  DraftSummary,
  ErrorField,
  FormErrors,
  JobAttachment,
  PostJobFormData,
} from '../../types/jobs/post-job';

export const INITIAL_POST_JOB_FORM_DATA: PostJobFormData = {
  title: '',
  description: '',
  skillsRequired: [],
  budget: {
    type: 'negotiable',
    amount: '',
    materialsIncluded: false,
  },
  location: {
    address: '',
    city: '',
    state: '',
    pincode: '',
    lat: null,
    lng: null,
  },
  deadline: '',
  urgency: 'flexible',
  type: 'one-time',
  scheduledDate: '',
  attachments: [],
};

export type AttachmentCounts = {
  photos: number;
  videos: number;
};

export function getPostJobAttachmentCounts(attachments: JobAttachment[]): AttachmentCounts {
  return attachments.reduce<AttachmentCounts>(
    (counts, attachment) => ({
      photos: counts.photos + (attachment.isImage ? 1 : 0),
      videos: counts.videos + (attachment.isVideo ? 1 : 0),
    }),
    { photos: 0, videos: 0 }
  );
}

export function mapDraftSummaryToPostJobFormData(draft: DraftSummary): PostJobFormData {
  return {
    title: draft.title || '',
    description: draft.description || '',
    skillsRequired: draft.skillsRequired || [],
    budget: {
      type: draft.budget?.type ?? 'negotiable',
      amount: draft.budget?.amount ?? '',
      materialsIncluded: draft.budget?.materialsIncluded ?? false,
    },
    type: draft.type || 'one-time',
    location: {
      address: draft.location?.address ?? '',
      city: draft.location?.city ?? '',
      state: draft.location?.state ?? '',
      pincode: draft.location?.pincode ?? '',
      lat: draft.location?.lat ?? null,
      lng: draft.location?.lng ?? null,
      _original: draft.location?._original,
    },
    deadline: draft.deadline || '',
    urgency: draft.urgency || 'flexible',
    scheduledDate: draft.scheduledDate || '',
    attachments: draft.attachments || [],
  };
}

const POST_JOB_ERROR_FIELD_LABELS: Record<ErrorField, string> = {
  title: 'Job Title',
  description: 'Job Description',
  skillsRequired: 'Required Skills',
  'budget.type': 'Budget Type',
  'budget.amount': 'Budget Amount',
  'location.address': 'Job Address',
  'location.city': 'City',
  'location.pincode': 'Pincode',
  deadline: 'Job Deadline',
  scheduledDate: 'Scheduled Date',
  urgency: 'Urgency Level',
  attachments: 'Photos/Videos',
};

export function getPostJobErrorFieldLabel(field: string): string {
  if (field in POST_JOB_ERROR_FIELD_LABELS) {
    return POST_JOB_ERROR_FIELD_LABELS[field as ErrorField];
  }

  return field.replace(/\./g, ' ').replace(/([A-Z])/g, ' $1');
}

export function getFirstPostJobErrorMessage(errors: FormErrors, fallback: string): string {
  const firstError = Object.values(errors).find((message) => Boolean(message));
  return firstError || fallback;
}

export function formatPostJobScheduleDisplay(formData: PostJobFormData): string {
  const dateValue = formData.urgency === 'scheduled' ? formData.scheduledDate : formData.deadline;

  if (!dateValue) {
    return 'Not set';
  }

  return new Date(dateValue).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
