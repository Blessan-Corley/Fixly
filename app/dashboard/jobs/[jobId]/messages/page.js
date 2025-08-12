'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Send,
  ArrowLeft,
  Paperclip,
  Image,
  Loader,
  User
} from 'lucide-react';
import { useApp } from '../../../../providers';
import { toast } from 'sonner';

export default function MessagesPage({ params }) {
  const { jobId } = params;
  const { user } = useApp();
  const router = useRouter();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [job, setJob] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    fetchJobAndMessages();
    
    // Start real-time polling
    startPolling();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [jobId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchJobAndMessages = async () => {
    try {
      setLoading(true);
      
      // Fetch job details
      const jobResponse = await fetch(`/api/jobs/${jobId}`);
      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob(jobData.job);
      }

      // Fetch messages
      const messagesResponse = await fetch(`/api/jobs/${jobId}/messages`);
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages || []);
        setLastUpdated(new Date());
      } else {
        const errorData = await messagesResponse.json();
        toast.error(errorData.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear immediately
    setSending(true);
    
    // Optimistic update
    const optimisticMessage = {
      _id: Date.now().toString(),
      message: messageText,
      sender: {
        _id: user._id,
        name: user.name,
        photoURL: user.photoURL
      },
      sentAt: new Date().toISOString(),
      read: false
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await fetch(`/api/jobs/${jobId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(msg => 
          msg._id === optimisticMessage._id ? data.message : msg
        ));
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
        setNewMessage(messageText); // Restore text
        toast.error(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
      setNewMessage(messageText); // Restore text
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const startPolling = () => {
    // Poll for new messages every 3 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/messages`);
        if (response.ok) {
          const data = await response.json();
          const newMessages = data.messages || [];
          
          // Only update if there are new messages
          if (JSON.stringify(newMessages) !== JSON.stringify(messages)) {
            setMessages(newMessages);
          }
        }
      } catch (error) {
        // Silent fail for polling
        console.error('Polling error:', error);
      }
    }, 3000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    });
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="animate-spin h-8 w-8 text-fixly-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="btn-ghost mr-4 flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-fixly-text">Messages</h1>
          {job && (
            <p className="text-fixly-text-muted text-sm">
              {job.title}
            </p>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="card p-0 h-[600px] flex flex-col">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-fixly-text-muted">
                No messages yet. Start the conversation!
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.sender._id === user._id;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-lg p-3 ${
                        isOwn
                          ? 'bg-fixly-accent text-fixly-text'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                    </div>
                    <div className={`text-xs text-fixly-text-muted mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                      {!isOwn && (
                        <span className="font-medium">{message.sender.name} • </span>
                      )}
                      {formatTime(message.sentAt)}
                    </div>
                  </div>
                  
                  {!isOwn && (
                    <div className="order-1 mr-3">
                      {message.sender.photoURL ? (
                        <img
                          src={message.sender.photoURL}
                          alt={message.sender.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-fixly-accent flex items-center justify-center">
                          <User className="h-4 w-4 text-fixly-text" />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-fixly-border p-4">
          <div className="flex space-x-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 resize-none rounded-lg border border-fixly-border p-3 focus:outline-none focus:ring-2 focus:ring-fixly-accent focus:border-fixly-accent"
              rows="2"
              maxLength={1000}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="btn-primary flex items-center justify-center w-12 h-12 rounded-lg"
            >
              {sending ? (
                <Loader className="animate-spin h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="text-xs text-fixly-text-muted mt-2">
            {newMessage.length}/1000 characters
          </div>
        </div>
      </div>
    </div>
  );
}