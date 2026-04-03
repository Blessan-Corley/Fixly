'use client';

import { motion } from 'framer-motion';
import { Loader, Send, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { MessageModalProps } from './find-fixers.types';
import { isAbortError, isRecord, toStringSafe } from './find-fixers.utils';

export default function FixerMessageModal({ fixer, onClose }: MessageModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const sendAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (sendAbortRef.current) sendAbortRef.current.abort();
    };
  }, []);

  const handleSendMessage = async (): Promise<void> => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      if (sendAbortRef.current) {
        sendAbortRef.current.abort();
      }
      const abortController = new AbortController();
      sendAbortRef.current = abortController;

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: fixer._id,
          content: message.trim(),
          messageType: 'text',
        }),
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) {
        return;
      }

      const data = (await response.json()) as unknown;
      const messageText = isRecord(data) ? toStringSafe(data.message, '') : '';

      if (response.ok) {
        toast.success('Message sent successfully!');
        onClose();
      } else {
        toast.error(messageText || 'Failed to send message');
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md rounded-xl bg-fixly-card"
      >
        {/* Header */}
        <div className="border-b border-fixly-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src={fixer.profilePhoto || '/default-avatar.png'}
                alt={`${fixer.name} profile photo`}
                width={48}
                height={48}
                unoptimized
                className="h-12 w-12 rounded-full object-cover"
              />
              <div>
                <h2 className="text-lg font-semibold text-fixly-text">Contact {fixer.name}</h2>
                <p className="text-sm text-fixly-text-muted">
                  Send a message to start the conversation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-fixly-bg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-fixly-text">Your Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi, I'm interested in your services for my project. Could you please provide more details about your availability and pricing?"
              className="textarea-field h-32 resize-none"
              maxLength={500}
            />
            <div className="mt-1 text-right text-xs text-fixly-text-muted">
              {message.length}/500
            </div>
          </div>

          <div className="mb-4 rounded-lg bg-fixly-bg p-3">
            <p className="text-sm text-fixly-text-muted">
              <strong>Tip:</strong> Be specific about your project requirements, timeline, and
              location to get a better response.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
              className="btn-primary flex flex-1 items-center justify-center"
            >
              {sending ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Message
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
