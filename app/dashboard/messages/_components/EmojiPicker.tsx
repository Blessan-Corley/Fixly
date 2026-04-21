'use client';

import * as Popover from '@radix-ui/react-popover';
import { Smile } from 'lucide-react';
import { useState } from 'react';

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀', '😂', '🥲', '😊', '😇', '🙂', '😉', '😍', '🤩', '😘', '😎', '🥳', '😜', '🤔', '😐', '😑', '😶', '🙄', '😒', '😔', '😢', '😭', '😤', '😡', '🤯', '😱', '🤗', '😴'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '👋', '🙌', '👏', '🤝', '🙏', '💪', '☝️', '👆', '👇', '👉', '👈'],
  },
  {
    label: 'Objects',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💯', '✅', '❌', '⚡', '🔥', '🎉', '🎊', '🎁', '💡', '🔑', '📱', '💻', '🛠️', '📝', '📅', '⏰', '💰', '💸'],
  },
  {
    label: 'Nature',
    emojis: ['🌟', '⭐', '🌙', '☀️', '🌈', '🌸', '🌺', '🍀', '🌿', '🌊', '🔮', '🌍'],
  },
];

type EmojiPickerProps = {
  onEmojiSelect: (emoji: string) => void;
};

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Insert emoji"
          className="rounded-lg p-2 text-fixly-text-light hover:bg-fixly-bg hover:text-fixly-accent"
        >
          <Smile className="h-5 w-5" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 w-72 rounded-xl border border-fixly-border bg-fixly-card shadow-xl focus:outline-none"
        >
          {/* Category tabs */}
          <div className="flex border-b border-fixly-border px-2 pt-2">
            {EMOJI_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveCategory(idx)}
                className={`rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === idx
                    ? 'border-b-2 border-fixly-accent text-fixly-accent'
                    : 'text-fixly-text-light hover:text-fixly-text'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="grid grid-cols-8 gap-0.5 p-2">
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onEmojiSelect(emoji);
                  setOpen(false);
                }}
                className="flex items-center justify-center rounded-md p-1.5 text-lg hover:bg-fixly-bg transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>

          <Popover.Arrow className="fill-fixly-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
