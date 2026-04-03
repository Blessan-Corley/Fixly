'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/primitives/Select';

import {
  ContactPageSchema,
  DEFAULT_CONTACT_FORM_DATA,
  zodResolver,
  type ContactFormData,
} from './contact.types';

export default function ContactForm(): JSX.Element {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(ContactPageSchema),
    defaultValues: DEFAULT_CONTACT_FORM_DATA,
  });

  const selectedCategory = watch('category') ?? 'general';

  const onSubmit = async (formData: ContactFormData): Promise<void> => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as { message?: string };

      if (response.ok) {
        setSubmitted(true);
        toast.success(data.message ?? "Message sent successfully! We'll get back to you soon.", {
          style: { background: 'green', color: 'white' },
        });
        reset(DEFAULT_CONTACT_FORM_DATA);
      } else {
        toast.error(data.message ?? 'Failed to send message. Please try again.', {
          style: { background: 'red', color: 'white' },
        });
      }
    } catch (error) {
      console.error('Contact form submission error:', error);
      toast.error('Network error. Please check your connection and try again.', {
        style: { background: 'red', color: 'white' },
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="card"
    >
      <h2 className="mb-6 text-2xl font-bold text-fixly-text">Send us a Message</h2>
      <p className="mb-6 text-fixly-text-light">
        Fill out the form below and we&apos;ll get back to you as soon as possible.
      </p>

      {submitted ? (
        <div className="py-12 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h3 className="mb-2 text-xl font-semibold text-fixly-text">Message Sent Successfully!</h3>
          <p className="mb-6 text-fixly-text-light">
            Thank you for contacting us. We&apos;ll respond within 24 hours.
          </p>
          <button onClick={() => setSubmitted(false)} className="btn-primary">
            Send Another Message
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit, () => toast.error('Please fill in all required fields'))}
          className="space-y-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Full Name *</label>
              <input
                type="text"
                {...register('name')}
                className="input-field"
                placeholder="Enter your full name"
              />
              {errors.name?.message ? (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">
                Email Address *
              </label>
              <input
                type="email"
                {...register('email')}
                className="input-field"
                placeholder="Enter your email"
              />
              {errors.email?.message ? (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Phone Number</label>
              <input
                type="tel"
                {...register('phone')}
                className="input-field"
                placeholder="Enter your phone number"
              />
              {errors.phone?.message ? (
                <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fixly-text">Category</label>
              <input type="hidden" {...register('category')} />
              <Select
                value={selectedCategory}
                onValueChange={(value) =>
                  setValue('category', value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="select-field" aria-label="Category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Inquiry</SelectItem>
                  <SelectItem value="technical">Technical Support</SelectItem>
                  <SelectItem value="billing">Billing & Account</SelectItem>
                  <SelectItem value="report">Report an Issue</SelectItem>
                  <SelectItem value="feedback">Feedback & Suggestions</SelectItem>
                </SelectContent>
              </Select>
              {errors.category?.message ? (
                <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">Subject</label>
            <input
              type="text"
              {...register('subject')}
              className="input-field"
              placeholder="Brief description of your inquiry"
            />
            {errors.subject?.message ? (
              <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">Message *</label>
            <textarea
              {...register('message')}
              rows={5}
              className="textarea-field"
              placeholder="Please describe your question or issue in detail..."
            />
            {errors.message?.message ? (
              <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex w-full items-center justify-center"
          >
            {isSubmitting ? (
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-fixly-text border-t-transparent" />
            ) : (
              <Send className="mr-2 h-5 w-5" />
            )}
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      )}
    </motion.div>
  );
}
