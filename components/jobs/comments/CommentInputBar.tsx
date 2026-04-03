'use client';

import { Send } from 'lucide-react';
import Image from 'next/image';
import type { KeyboardEvent } from 'react';

type CommentInputBarProps = {
  userPhotoURL: string | undefined;
  newComment: string;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onPost: () => Promise<void>;
};

export default function CommentInputBar({
  userPhotoURL,
  newComment,
  onChange,
  onKeyDown,
  onPost,
}: CommentInputBarProps): JSX.Element {
  return (
    <div className="border-t border-fixly-border p-4 dark:border-gray-700">
      <div className="flex space-x-3">
        <Image
          src={userPhotoURL ?? '/default-avatar.png'}
          alt="Your profile photo"
          width={32}
          height={32}
          unoptimized
          className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
        />
        <div className="flex flex-1 space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 rounded-full border border-fixly-border bg-fixly-bg px-4 py-2 text-fixly-text focus:outline-none focus:ring-2 focus:ring-fixly-accent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            onKeyDown={onKeyDown}
          />
          <button
            onClick={() => void onPost()}
            disabled={!newComment.trim()}
            className="rounded-full p-2 text-fixly-accent transition-colors hover:bg-fixly-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
