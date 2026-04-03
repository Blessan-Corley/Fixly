'use client';

import { Loader } from 'lucide-react';
import dynamic from 'next/dynamic';

import type { DeleteModalState, RepostModalState } from '@/app/dashboard/jobs/_lib/jobs.types';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { RepostSubmitData } from '@/components/ui/RepostJobModal';

const RepostJobModal = dynamic(() => import('@/components/ui/RepostJobModal'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 rounded-md border border-fixly-border p-3 text-sm text-fixly-text-muted">
      <Loader className="h-4 w-4 animate-spin" />
      Loading repost options...
    </div>
  ),
});

type JobsDialogsProps = {
  deleteModal: DeleteModalState;
  repostModal: RepostModalState;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  onCloseRepost: () => void;
  onConfirmRepost: (formData: RepostSubmitData) => void;
};

export function JobsDialogs({
  deleteModal,
  repostModal,
  onCloseDelete,
  onConfirmDelete,
  onCloseRepost,
  onConfirmRepost,
}: JobsDialogsProps): React.JSX.Element {
  return (
    <>
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        title="Delete Job"
        description="Are you sure you want to delete this job? This action cannot be undone and all applications will be lost."
        confirmText="Delete Job"
        cancelText="Cancel"
        type="danger"
        loading={deleteModal.loading}
      />

      <RepostJobModal
        isOpen={repostModal.isOpen}
        onClose={onCloseRepost}
        onConfirm={onConfirmRepost}
        job={repostModal.job}
        loading={repostModal.loading}
      />
    </>
  );
}
