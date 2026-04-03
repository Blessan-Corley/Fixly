'use client';

import { DollarSign, Star, X } from 'lucide-react';
import Image from 'next/image';

import SmartAvatar from '@/components/ui/SmartAvatar';

import { formatCurrency } from '../_lib/normalizers';
import type { PresenceUser } from '../_lib/types';

type ConversationInfoPanelProps = {
  participants: PresenceUser[];
  relatedJob: {
    title: string;
    budgetAmount: number | null;
  } | null;
  onClose: () => void;
};

export function ConversationInfoPanel({
  participants,
  relatedJob,
  onClose,
}: ConversationInfoPanelProps): React.JSX.Element {
  return (
    <div className="w-80 border-l border-fixly-border bg-fixly-card p-4">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-fixly-text">Conversation Info</h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-fixly-bg">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {participants.map((participant) => (
          <div key={participant.id} className="text-center">
            <div className="mx-auto mb-3">
              {participant.avatar ? (
                <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full">
                  <Image
                    src={participant.avatar}
                    alt={`${participant.name} profile photo`}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <SmartAvatar
                  user={{
                    name: participant.name,
                    image: '',
                  }}
                  size="xl"
                  className="mx-auto h-20 w-20"
                />
              )}
            </div>
            <h4 className="font-semibold text-fixly-text">{participant.name}</h4>
            <div className="mt-2 flex items-center justify-center text-sm text-fixly-text-light">
              <Star className="mr-1 h-4 w-4 text-yellow-500" />
              Profile participant
            </div>
          </div>
        ))}
      </div>

      {relatedJob && (
        <div className="mt-6 rounded-lg bg-fixly-bg p-4">
          <h4 className="mb-2 font-semibold text-fixly-text">Related Job</h4>
          <p className="mb-2 text-sm text-fixly-text-light">{relatedJob.title}</p>
          <div className="flex items-center text-sm text-fixly-text-light">
            <DollarSign className="mr-1 h-4 w-4" />
            {formatCurrency(relatedJob.budgetAmount)}
          </div>
        </div>
      )}
    </div>
  );
}
