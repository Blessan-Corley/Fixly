import type { FormErrors, PostJobFormData } from '../../types/jobs/post-job';
import { getPostJobAttachmentCounts } from '../jobs/post-job-helpers';

type ValidateContentFn = (text: string, fieldName: string) => Promise<string | null>;

export type ValidatePostJobStepOptions = {
  step: number;
  formData: PostJobFormData;
  isPro: boolean;
  validateContent?: ValidateContentFn;
};

function isPastOrNow(dateString: string): boolean {
  return new Date(dateString) <= new Date();
}

function applyDeadlineValidation(
  errors: FormErrors,
  formData: PostJobFormData,
  isPro: boolean,
  stepLabel: 'step3' | 'final'
): void {
  if (formData.urgency === 'scheduled') {
    if (!formData.scheduledDate) {
      errors.scheduledDate = 'Scheduled date is required for scheduled jobs';
    } else if (isPastOrNow(formData.scheduledDate)) {
      errors.scheduledDate = 'Scheduled date must be in the future';
    }
  } else {
    if (!formData.deadline) {
      errors.deadline = stepLabel === 'final' ? 'Job deadline is required' : 'Deadline is required';
    } else if (isPastOrNow(formData.deadline)) {
      errors.deadline = 'Deadline must be in the future';
    } else {
      const twentyFourHoursFromNow = new Date();
      twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);

      if (!isPro && new Date(formData.deadline) < twentyFourHoursFromNow) {
        errors.deadline =
          'Free users must set deadlines at least 24 hours in advance. Upgrade to Pro for priority scheduling.';
      }
    }
  }

  if (formData.scheduledDate && isPastOrNow(formData.scheduledDate)) {
    errors.scheduledDate = 'Scheduled date must be in the future';
  }
}

export function buildPostJobContentViolationMessage(
  fieldName: string,
  violationTypes: string[]
): string {
  let message = `${fieldName} contains inappropriate content: `;

  if (violationTypes.includes('profanity') || violationTypes.includes('abuse')) {
    message += 'abuse words, ';
  }
  if (violationTypes.includes('phone_number')) {
    message += 'phone numbers, ';
  }
  if (violationTypes.includes('email_address')) {
    message += 'email addresses, ';
  }
  if (violationTypes.includes('url') || violationTypes.includes('social_media')) {
    message += 'links/social media, ';
  }
  if (violationTypes.includes('promotional') || violationTypes.includes('spam')) {
    message += 'promotional content, ';
  }
  if (violationTypes.includes('location')) {
    message += 'location details, ';
  }

  return message.replace(/, $/, '');
}

export async function validatePostJobStep(
  options: ValidatePostJobStepOptions
): Promise<FormErrors> {
  const { step, formData, isPro, validateContent } = options;
  const newErrors: FormErrors = {};

  switch (step) {
    case 1:
      if (!formData.title || !formData.title.trim()) {
        newErrors.title = 'Title is required';
      } else if (formData.title.length < 10) {
        newErrors.title = 'Title must be at least 10 characters';
      } else if (validateContent) {
        const titleValidation = await validateContent(formData.title, 'Title');
        if (titleValidation) {
          newErrors.title = titleValidation;
        }
      }

      if (!formData.description || !formData.description.trim()) {
        newErrors.description = 'Description is required';
      } else if (formData.description.length < 30) {
        newErrors.description = 'Description must be at least 30 characters';
      } else if (validateContent) {
        const descValidation = await validateContent(formData.description, 'Description');
        if (descValidation) {
          newErrors.description = descValidation;
        }
      }

      if (formData.skillsRequired.length === 0) {
        newErrors.skillsRequired = 'At least one skill is required';
      }
      break;

    case 2:
      if (formData.budget.type !== 'negotiable' && !formData.budget.amount) {
        newErrors['budget.amount'] = 'Budget amount is required';
      }

      if (!formData.location.address || !formData.location.address.trim()) {
        newErrors['location.address'] = 'Address is required';
      }

      if (!formData.location.city || !formData.location.city.trim()) {
        newErrors['location.city'] = 'City is required';
      }

      if (formData.location.pincode && !/^[0-9]{6}$/.test(formData.location.pincode)) {
        newErrors['location.pincode'] = 'Invalid pincode format';
      }
      break;

    case 3: {
      applyDeadlineValidation(newErrors, formData, isPro, 'step3');

      const { photos } = getPostJobAttachmentCounts(formData.attachments);
      if (photos === 0) {
        newErrors.attachments = 'At least 1 photo is required';
      }
      break;
    }

    case 4: {
      if (!formData.title || !formData.title.trim()) {
        newErrors.title = 'Job title is required';
      } else if (formData.title.length < 10) {
        newErrors.title = 'Job title must be at least 10 characters';
      } else if (formData.title.length > 30) {
        newErrors.title = 'Job title cannot exceed 30 characters';
      }

      if (!formData.description || !formData.description.trim()) {
        newErrors.description = 'Job description is required';
      } else if (formData.description.length < 30) {
        newErrors.description = 'Description must be at least 30 characters';
      }

      if (formData.skillsRequired.length === 0) {
        newErrors.skillsRequired = 'At least one skill must be selected';
      }

      if (!formData.budget.type) {
        newErrors['budget.type'] = 'Budget type must be selected';
      }

      if (
        formData.budget.type !== 'negotiable' &&
        (!formData.budget.amount || Number(formData.budget.amount) <= 0)
      ) {
        newErrors['budget.amount'] = 'Valid budget amount is required';
      }

      if (!formData.location.address || !formData.location.address.trim()) {
        newErrors['location.address'] = 'Complete address is required';
      }

      if (!formData.location.city || !formData.location.city.trim()) {
        newErrors['location.city'] = 'City is required';
      }

      applyDeadlineValidation(newErrors, formData, isPro, 'final');

      if (!formData.urgency) {
        newErrors.urgency = 'Urgency level must be selected';
      }

      const { photos, videos } = getPostJobAttachmentCounts(formData.attachments);
      if (photos === 0) {
        newErrors.attachments = 'At least 1 photo is required to post a job';
      } else if (photos > 5) {
        newErrors.attachments = 'Maximum 5 photos allowed';
      }

      if (videos > 1) {
        newErrors.attachments = 'Maximum 1 video allowed';
      }
      break;
    }

    default:
      break;
  }

  return newErrors;
}
