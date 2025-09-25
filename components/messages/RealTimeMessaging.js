'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader
} from 'lucide-react';
import { toast } from 'sonner';
import { useAblyChannel } from '../../contexts/AblyContext';
import { CHANNELS, EVENTS } from '../../lib/ably';

export default function RealTimeMessaging({ conversationId, jobId }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Real-time message updates via Ably
  useAblyChannel(
    conversationId ? CHANNELS.conversation(conversationId) : null,
    EVENTS.MESSAGE_SENT,
    (message) => {
      const newMsg = message.data.message;

      // Don't add if it's our own message (already added optimistically)
      if (newMsg.sender._id !== session?.user?.id) {
        setMessages(prev => [...prev, newMsg]);
        scrollToBottom();

        // Show notification
        toast.info(`New message from ${newMsg.sender.name}`, {
          description: newMsg.content.length > 50 ?
            newMsg.content.substring(0, 50) + '...' :
            newMsg.content
        });
      }
    },
    [conversationId, session?.user?.id]
  );

  // Real-time read receipts
  useAblyChannel(
    conversationId ? CHANNELS.conversation(conversationId) : null,
    EVENTS.MESSAGES_READ,
    (message) => {
      const { readBy } = message.data;

      // Update read status for messages
      setMessages(prev =>
        prev.map(msg => {
          if (msg.sender._id === session?.user?.id && !msg.readBy?.[readBy]) {
            return {
              ...msg,
              readBy: { ...msg.readBy, [readBy]: new Date() }
            };
          }
          return msg;
        })
      );
    },
    [conversationId, session?.user?.id]
  );

  // Load conversation and messages
  useEffect(() => {
    if (!conversationId) return;

    const loadConversation = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/messages?conversationId=${conversationId}`);
        const data = await response.json();

        if (data.success) {
          setConversation(data.conversation);
          setMessages(data.conversation.messages || []);

          // Find other participant
          const other = data.conversation.participants.find(
            p => p._id !== session?.user?.id
          );
          setOtherUser(other);

          scrollToBottom();
        } else {
          toast.error('Failed to load conversation');
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        toast.error('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [conversationId, session?.user?.id]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    // Optimistic update
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      sender: {
        _id: session.user.id,
        name: session.user.name,
        photoURL: session.user.image
      },
      content: messageContent,
      timestamp: new Date(),
      messageType: 'text',
      sending: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          content: messageContent,
          messageType: 'text'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Replace optimistic message with real one
        setMessages(prev =>
          prev.map(msg =>
            msg._id === optimisticMessage._id ?
            { ...data.message, justSent: true } :
            msg
          )
        );
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
        toast.error(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // Format message timestamp
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;

    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render system message (job assignment details)
  const renderSystemMessage = (message) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200"
    >
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-green-800 mb-1">
            Job Assignment Details
          </div>
          <div className="prose prose-sm text-gray-700 whitespace-pre-line">
            {message.content}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {formatMessageTime(message.timestamp)}
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Render regular message
  const renderMessage = (message, index) => {
    const isOwnMessage = message.sender._id === session?.user?.id;
    const isRead = message.readBy && Object.keys(message.readBy).length > 1;

    return (
      <motion.div
        key={message._id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
          {!isOwnMessage && (
            <div className="text-xs text-gray-500 mb-1">
              {message.sender.name}
            </div>
          )}

          <div
            className={`px-4 py-2 rounded-lg ${
              isOwnMessage
                ? 'bg-fixly-accent text-white'
                : 'bg-gray-100 text-gray-800'
            } ${message.sending ? 'opacity-70' : ''}`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>

            <div className={`flex items-center justify-between mt-1 text-xs ${
              isOwnMessage ? 'text-white/70' : 'text-gray-500'
            }`}>
              <span>{formatMessageTime(message.timestamp)}</span>

              {isOwnMessage && (
                <div className="flex items-center ml-2">
                  {message.sending ? (
                    <Loader className="w-3 h-3 animate-spin" />
                  ) : isRead ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 opacity-50" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-fixly-accent" />
          <p className="text-gray-500">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-fixly-accent rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {otherUser?.name?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {otherUser?.name || 'Unknown User'}
            </h3>
            <p className="text-xs text-gray-500">
              {conversation?.relatedJob ? `Job: ${conversation.relatedJob.title}` : 'Direct Message'}
            </p>
          </div>
        </div>

        {otherUser && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {otherUser.phone && (
              <div className="flex items-center space-x-1">
                <Phone className="w-3 h-3" />
                <span>{otherUser.phone}</span>
              </div>
            )}
            {otherUser.email && (
              <div className="flex items-center space-x-1">
                <Mail className="w-3 h-3" />
                <span>{otherUser.email}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {messages.map((message, index) => {
            if (message.messageType === 'system') {
              return renderSystemMessage(message);
            }
            return renderMessage(message, index);
          })}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent focus:border-transparent"
            disabled={isSending}
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="px-4 py-2 bg-fixly-accent text-white rounded-lg hover:bg-fixly-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="text-xs text-gray-400 mt-1">
          Contact details are allowed in private messages • {newMessage.length}/1000
        </div>
      </form>
    </div>
  );
}