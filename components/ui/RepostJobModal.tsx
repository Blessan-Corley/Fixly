'use client';

import { X, RotateCcw, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, type SubmitErrorHandler } from 'react-hook-form';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/primitives/Dialog';

import {
  buildInitialFormData,
  makeZodResolver,
  RepostFormSchema,
  type RepostFormData,
  type RepostableJob,
  type RepostSubmitData,
} from './RepostJobModal.utils';

export type { RepostSubmitData };

interface RepostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RepostSubmitData) => void | Promise<void>;
  job?: RepostableJob | null;
  loading?: boolean;
}

export default function RepostJobModal({
  isOpen,
  onClose,
  onConfirm,
  job,
  loading = false,
}: RepostJobModalProps): React.JSX.Element | null {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RepostFormData>({
    resolver: makeZodResolver(RepostFormSchema),
    defaultValues: buildInitialFormData(job),
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);

    reset({
      ...buildInitialFormData(job),
      deadline: defaultDeadline.toISOString().slice(0, 16),
    });
  }, [isOpen, job, reset]);

  const onSubmit = async (formData: RepostFormData): Promise<void> => {
    await onConfirm({
      ...formData,
      budgetAmount:
        formData.budgetType === 'negotiable' ? null : Number.parseFloat(formData.budgetAmount),
    });
  };

  const onInvalidSubmit: SubmitErrorHandler<RepostFormData> = () => {
    return;
  };

  const budgetType = watch('budgetType');

  if (!isOpen) {
    return null;
  }

  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="w-full max-w-lg rounded-2xl border border-fixly-border bg-fixly-card p-0">
        <DialogHeader className="flex-row items-center justify-between border-b border-fixly-border p-6">
          <div className="flex items-center">
            <div className="mr-3 rounded-lg bg-green-100 p-2">
              <RotateCcw className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-lg text-fixly-text">Repost Job</DialogTitle>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-fixly-accent/10"
          >
            <X className="h-5 w-5 text-fixly-text-muted" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-4 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">Job Title</label>
            <input
              type="text"
              {...register('title')}
              className={`input-field ${errors.title ? 'border-red-500' : ''}`}
              placeholder="Enter job title"
            />
            {errors.title && (
              <p className="mt-1 flex items-center text-sm text-red-500">
                <AlertCircle className="mr-1 h-4 w-4" />
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">Budget</label>
            <div className="space-y-3">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="fixed"
                    {...register('budgetType')}
                    className="mr-2"
                  />
                  Fixed Price
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="negotiable"
                    {...register('budgetType')}
                    className="mr-2"
                  />
                  Negotiable
                </label>
              </div>

              {budgetType === 'fixed' && (
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
                  <input
                    type="number"
                    {...register('budgetAmount')}
                    className={`input-field pl-10 ${errors.budgetAmount ? 'border-red-500' : ''}`}
                    placeholder="Enter amount in ₹"
                    min="1"
                  />
                </div>
              )}
            </div>
            {errors.budgetAmount && (
              <p className="mt-1 flex items-center text-sm text-red-500">
                <AlertCircle className="mr-1 h-4 w-4" />
                {errors.budgetAmount.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">New Deadline</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-fixly-text-muted" />
              <input
                type="datetime-local"
                {...register('deadline')}
                className={`input-field pl-10 ${errors.deadline ? 'border-red-500' : ''}`}
                min={minDateTime}
              />
            </div>
            {errors.deadline && (
              <p className="mt-1 flex items-center text-sm text-red-500">
                <AlertCircle className="mr-1 h-4 w-4" />
                {errors.deadline.message}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start">
              <AlertCircle className="mr-2 mt-0.5 h-5 w-5 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p className="mb-1 font-medium">Repost Information</p>
                <ul className="list-inside list-disc space-y-1 text-blue-700">
                  <li>Your job will be reposted with updated details</li>
                  <li>Previous applications will not be carried over</li>
                  <li>The job will appear as a new posting to fixers</li>
                </ul>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="space-x-3 border-t border-fixly-border p-6 pt-0">
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-all duration-200 hover:bg-green-700 ${
              loading ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Reposting...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Repost Job
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
