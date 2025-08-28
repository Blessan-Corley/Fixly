'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Check, CheckCheck, X, Image as ImageIcon, Video, Paperclip } from 'lucide-react';
import { useRealtime } from '../../hooks/useRealtime';
import { useApp } from '../../app/providers';
import { MessageMediaUpload } from '../ui/FileUpload';

export default function InstantMessage({ 
  conversationId, 
  recipientId, 
  className = '' 
}) {
  const { user } = useApp();
  const { sendMessage, messages, connected } = useRealtime(user?.id, true);
  
  const [message, setMessage] = useState('');
  const [conversationMessages, setConversationMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const messagesEndRef = useRef(null);

  // Filter messages for this conversation
  useEffect(() => {
    const filtered = messages.filter(msg => 
      msg.conversationId === conversationId ||
      (msg.senderId === user?.id && msg.recipientId === recipientId) ||
      (msg.senderId === recipientId && msg.recipientId === user?.id)
    );
    setConversationMessages(filtered);
  }, [messages, conversationId, recipientId, user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!message.trim() && attachments.length === 0) || !connected) return;

    const messageContent = message.trim();
    const currentAttachments = [...attachments];
    
    setMessage(''); // Instantly clear input
    setAttachments([]); // Clear attachments
    setShowMediaUpload(false);

    // Determine message type
    const messageType = currentAttachments.length > 0 ? 'media' : 'text';

    // Instantly add message to UI - no loading states
    const optimisticMessage = {
      id: `temp_${Date.now()}`,
      content: messageContent,
      senderId: user.id,
      recipientId,
      timestamp: new Date().toISOString(),
      status: 'sent', // Show as sent immediately
      optimistic: true,
      type: messageType,
      attachments: currentAttachments
    };

    setConversationMessages(prev => [...prev, optimisticMessage]);

    // Send in background - no loading indicators
    try {
      const result = await sendMessage(recipientId, messageContent, {
        conversationId,
        type: messageType,
        attachments: currentAttachments
      });

      if (result) {
        // Replace optimistic message with real message
        setConversationMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { ...result, status: 'sent', optimistic: false }
              : msg
          )
        );
      }
    } catch (error) {
      // On error, mark message as failed but keep it visible
      setConversationMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
      console.error('Failed to send message:', error);
    }
  };

  // Handle media uploads
  const handleMediaUpload = (uploadResults) => {
    const mediaAttachments = uploadResults.map(result => ({
      url: result.url,
      type: result.resourceType,
      filename: result.filename,
      size: result.size,
      width: result.width,
      height: result.height,
      duration: result.duration
    }));
    
    setAttachments(prev => [...prev, ...mediaAttachments]);
    setShowMediaUpload(false);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
          {conversationMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  msg.senderId === user?.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                } ${msg.optimistic ? 'opacity-70' : ''}`}
              >
                {/* Media Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2 space-y-2">
                    {msg.attachments.map((attachment, index) => (
                      <div key={index} className="rounded-lg overflow-hidden">
                        {attachment.type === 'image' ? (
                          <img
                            src={attachment.url}
                            alt={attachment.filename}
                            className="max-w-full h-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ maxHeight: '200px' }}
                            onClick={() => window.open(attachment.url, '_blank')}
                          />
                        ) : attachment.type === 'video' ? (
                          <video
                            src={attachment.url}
                            controls
                            className="max-w-full h-auto rounded"
                            style={{ maxHeight: '200px' }}
                          >
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <div className="flex items-center space-x-2 p-2 bg-black bg-opacity-10 rounded">
                            <Paperclip className="h-4 w-4" />
                            <span className="text-xs truncate">{attachment.filename}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Text Content */}
                {msg.content && <p className="text-sm">{msg.content}</p>}
                {msg.senderId === user?.id && (
                  <div className="flex items-center justify-end mt-1">
                    <span className="text-xs opacity-75 mr-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {msg.status === 'sent' ? (
                      <Check className="h-3 w-3" />
                    ) : msg.status === 'delivered' ? (
                      <CheckCheck className="h-3 w-3" />
                    ) : msg.status === 'failed' ? (
                      <X className="h-3 w-3 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        {/* Media Upload Area */}
        {showMediaUpload && (
          <div className="mb-4">
            <MessageMediaUpload
              onUploadComplete={handleMediaUpload}
              onUploadError={(error) => console.error('Media upload error:', error)}
              className="!p-3 !border-gray-200"
            />
          </div>
        )}

        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="relative group">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  {attachment.type === 'image' ? (
                    <img
                      src={attachment.url}
                      alt={attachment.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : attachment.type === 'video' ? (
                    <div className="text-blue-500">
                      <Video className="h-6 w-6" />
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Paperclip className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage}>
          <div className="flex space-x-2">
            {/* Media Upload Button */}
            <button
              type="button"
              onClick={() => setShowMediaUpload(!showMediaUpload)}
              className={`p-2 rounded-full transition-colors ${
                showMediaUpload 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
              }`}
              disabled={!connected}
            >
              <ImageIcon className="h-5 w-5" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={attachments.length > 0 ? "Add a caption..." : "Type your message..."}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!connected}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!message.trim() && attachments.length === 0) || !connected}
              className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {/* Connection Status */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {!connected ? (
                <div className="text-xs text-red-500 flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                  Reconnecting...
                </div>
              ) : (
                <div className="text-xs text-green-500 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  Connected
                </div>
              )}
              
              {attachments.length > 0 && (
                <span className="text-xs text-gray-500">
                  {attachments.length} file{attachments.length > 1 ? 's' : ''} attached
                </span>
              )}
            </div>
            
            {(message.length > 0 || attachments.length > 0) && (
              <span className="text-xs text-gray-400">
                {message.length > 0 && `${message.length} chars`}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}