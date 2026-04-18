import type { FormErrors, PostJobFormData } from '../../types/jobs/post-job';

export function isPastOrNow(dateString: string): boolean {
  return new Date(dateString) <= new Date();
}

export function applyDeadlineValidation(
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
