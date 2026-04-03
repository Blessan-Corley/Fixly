'use client';

type TypingUser = { userId: string; userName: string };

type TypingIndicatorProps = {
  typingUsers: TypingUser[];
};

export function TypingIndicator({ typingUsers }: TypingIndicatorProps): React.JSX.Element | null {
  if (typingUsers.length === 0) return null;

  return (
    <div className="px-4 py-2 text-xs italic text-fixly-text-light">
      {typingUsers.map((entry) => entry.userName).join(', ')}{' '}
      {typingUsers.length === 1 ? 'is' : 'are'} typing...
    </div>
  );
}
