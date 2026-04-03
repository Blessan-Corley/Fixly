import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';

import { ContactFormSchema } from '@/lib/validations/contact';

export const ContactPageSchema = ContactFormSchema.extend({
  category: ContactFormSchema.shape.category.optional(),
  phone: ContactFormSchema.shape.phone.optional(),
  subject: ContactFormSchema.shape.subject.optional(),
});

export type ContactFormData = z.input<typeof ContactPageSchema>;

export const DEFAULT_CONTACT_FORM_DATA: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  category: 'general',
};

export function zodResolver<TFieldValues extends FieldValues>(
  schema: z.ZodTypeAny
): Resolver<TFieldValues> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data as TFieldValues, errors: {} };
    }

    const errors: FieldErrors<TFieldValues> = {};
    const mutableErrors = errors as Record<string, unknown>;

    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? 'root');
      if (mutableErrors[key]) continue;
      mutableErrors[key] = { type: issue.code, message: issue.message };
    }

    return { values: {} as Record<string, never>, errors };
  };
}
