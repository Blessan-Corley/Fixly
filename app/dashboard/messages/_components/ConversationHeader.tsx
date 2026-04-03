'use client';

import { ArrowLeft, Info, Phone, Video } from 'lucide-react';
import Image from 'next/image';

import SmartAvatar from '@/components/ui/SmartAvatar';

type ConversationHeaderProps = {
  name: string;
  photoURL?: string;
  statusText: string;
  isOnline: boolean;
  isMobile: boolean;
  onBack: () => void;
  onToggleInfo: () => void;
};

export function ConversationHeader({
  name,
  photoURL,
  statusText,
  isOnline,
  isMobile,
  onBack,
  onToggleInfo,
}: ConversationHeaderProps): React.JSX.Element {
  return (
    <div className="border-b border-fixly-border bg-fixly-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button type="button" onClick={onBack} className="rounded-lg p-2 hover:bg-fixly-bg">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="relative">
            {photoURL ? (
              <div className="relative h-10 w-10 overflow-hidden rounded-full">
                <Image
                  src={photoURL}
                  alt={`${name} profile photo`}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <SmartAvatar
                user={{
                  name,
                  image: '',
                }}
                size="default"
                className="h-10 w-10"
              />
            )}
            {isOnline && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-fixly-card bg-green-500" />
            )}
          </div>

          <div>
            <h3 className="font-semibold text-fixly-text">{name}</h3>
            <p className="text-sm text-fixly-text-light">{statusText}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg p-2 hover:bg-fixly-bg">
            <Phone className="h-5 w-5 text-fixly-text-light" />
          </button>
          <button type="button" className="rounded-lg p-2 hover:bg-fixly-bg">
            <Video className="h-5 w-5 text-fixly-text-light" />
          </button>
          <button type="button" onClick={onToggleInfo} className="rounded-lg p-2 hover:bg-fixly-bg">
            <Info className="h-5 w-5 text-fixly-text-light" />
          </button>
        </div>
      </div>
    </div>
  );
}
