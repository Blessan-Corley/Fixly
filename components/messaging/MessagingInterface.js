// WhatsApp-like messaging interface component
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';

const MessagingInterface = ({ 
  conversationId, 
  recipientId, 
  recipientInfo,
  onClose 
}) => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [typingTimer, setTypingTimer] = useState(null);
  const [messageDeliveryStatus, setMessageDeliveryStatus] = useState({});
  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const eventSourceRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  // Initialize real-time connection
  useEffect(() => {
    if (!session?.user?.id || !conversationId) return;

    const initializeConnection = async () => {
      try {
        // Connect to SSE for real-time updates
        const eventSource = new EventSource(`/api/realtime/sse?userId=${session.user.id}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('🔗 Connected to real-time messaging');
          setConnectionStatus('connected');
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleRealtimeMessage(data);
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          setConnectionStatus('error');
          setTimeout(() => {
            if (eventSource.readyState === EventSource.CLOSED) {
              initializeConnection();
            }
          }, 5000);
        };

        // Load initial messages
        await loadMessages();
        
        // Join conversation room
        await joinConversation();
        
        // Get recipient status
        await updateRecipientStatus();
        
      } catch (error) {
        console.error('Error initializing messaging:', error);
        setIsLoading(false);
      }
    };

    initializeConnection();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Leave conversation room
      leaveConversation();
    };
  }, [session?.user?.id, conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRealtimeMessage = useCallback((data) => {
    switch (data.type) {
      case 'message:private':
        if (data.senderId === recipientId || data.recipientId === session?.user?.id) {
          addNewMessage(data.message);
          // Mark as delivered
          if (data.senderId === recipientId) {
            markMessageAsDelivered(data.message.id);
          }
        }
        break;
        
      case 'typing:start':
        if (data.userId === recipientId && data.conversationId === conversationId) {
          setRecipientTyping(true);
        }
        break;
        
      case 'typing:stop':
        if (data.userId === recipientId && data.conversationId === conversationId) {
          setRecipientTyping(false);
        }
        break;
        
      case 'user:online':
        if (data.userId === recipientId) {
          setIsOnline(true);
          setLastSeen(null);
        }
        break;
        
      case 'user:offline':
        if (data.userId === recipientId) {
          setIsOnline(false);
          setLastSeen(new Date());
        }
        break;
        
      case 'message:delivered':
        updateMessageStatus(data.messageId, 'delivered');
        break;
        
      case 'message:read':
        updateMessageStatus(data.messageId, 'read');
        break;
        
      case 'presence:update':
        if (data.userId === recipientId) {
          setIsOnline(data.isOnline);
          if (!data.isOnline && data.lastSeen) {
            setLastSeen(new Date(data.lastSeen));
          }
        }
        break;
    }
  }, [recipientId, conversationId, session?.user?.id]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages?conversationId=${conversationId}&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages || []);
        // Mark messages as read
        const unreadMessages = data.messages?.filter(m => 
          m.senderId === recipientId && m.status !== 'read'
        );
        if (unreadMessages?.length > 0) {
          await markMessagesAsRead(unreadMessages.map(m => m.id));
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const joinConversation = async () => {
    try {
      await fetch('/api/realtime/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId: `conversation_${conversationId}`,
          userId: session.user.id
        })
      });
    } catch (error) {
      console.error('Error joining conversation:', error);
    }
  };

  const leaveConversation = async () => {
    try {
      await fetch('/api/realtime/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomId: `conversation_${conversationId}`,
          userId: session.user.id
        })
      });
    } catch (error) {
      console.error('Error leaving conversation:', error);
    }
  };

  const updateRecipientStatus = async () => {
    try {
      const response = await fetch(`/api/user/presence?userId=${recipientId}`);
      const data = await response.json();
      
      if (data.success) {
        setIsOnline(data.isOnline);
        if (!data.isOnline && data.lastSeen) {
          setLastSeen(new Date(data.lastSeen));
        }
      }
    } catch (error) {
      console.error('Error updating recipient status:', error);
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !session?.user?.id) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    
    // Optimistic update
    const tempMessage = {
      id: `temp_${Date.now()}`,
      senderId: session.user.id,
      recipientId: recipientId,
      content: messageText,
      timestamp: new Date(),
      status: 'sending',
      isTemp: true
    };
    
    addNewMessage(tempMessage);
    stopTyping();

    try {
      const response = await fetch('/api/realtime/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          content: messageText,
          conversationId,
          type: 'text'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Replace temp message with real message
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, id: data.data.messageId, status: 'sent', isTemp: false }
            : msg
        ));
        
        // Store message status
        setMessageDeliveryStatus(prev => ({
          ...prev,
          [data.data.messageId]: 'sent'
        }));
        
      } else {
        // Mark temp message as failed
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'failed' }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id 
          ? { ...msg, status: 'failed' }
          : msg
      ));
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (e.target.value.trim() && !isTyping) {
      startTyping();
    } else if (!e.target.value.trim() && isTyping) {
      stopTyping();
    }
  };

  const startTyping = () => {
    if (isTyping) return;
    
    setIsTyping(true);
    
    // Send typing indicator
    fetch('/api/realtime/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        conversationId,
        recipientId
      })
    });
    
    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (!isTyping) return;
    
    setIsTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send stop typing indicator
    fetch('/api/realtime/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'stop',
        conversationId,
        recipientId
      })
    });
  };

  const addNewMessage = (message) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(msg => msg.id === message.id)) {
        return prev;
      }
      
      // Insert in chronological order
      const newMessages = [...prev, message].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      return newMessages;
    });
  };

  const markMessageAsDelivered = async (messageId) => {
    try {
      await fetch('/api/messages/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          status: 'delivered'
        })
      });
      
      updateMessageStatus(messageId, 'delivered');
    } catch (error) {
      console.error('Error marking message as delivered:', error);
    }
  };

  const markMessagesAsRead = async (messageIds) => {
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageIds,
          conversationId
        })
      });
      
      messageIds.forEach(id => updateMessageStatus(id, 'read'));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const updateMessageStatus = (messageId, status) => {
    setMessageDeliveryStatus(prev => ({
      ...prev,
      [messageId]: status
    }));
    
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status } : msg
    ));
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'last seen recently';
    
    const date = new Date(timestamp);
    const now = new Date();
    const minutesAgo = differenceInMinutes(now, date);
    
    if (minutesAgo < 1) return 'last seen just now';
    if (minutesAgo < 60) return `last seen ${minutesAgo}m ago`;
    if (isToday(date)) return `last seen today at ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `last seen yesterday at ${format(date, 'HH:mm')}`;
    return `last seen ${format(date, 'MMM dd at HH:mm')}`;
  };

  const getMessageStatusIcon = (message) => {
    if (message.senderId !== session?.user?.id) return null;
    
    const status = message.status || messageDeliveryStatus[message.id] || 'sending';
    
    switch (status) {
      case 'sending':
        return <span className="text-gray-400">○</span>;
      case 'sent':
        return <span className="text-gray-400">✓</span>;
      case 'delivered':
        return <span className="text-gray-400">✓✓</span>;
      case 'read':
        return <span className="text-blue-500">✓✓</span>;
      case 'failed':
        return <span className="text-red-500">!</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            ←
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={recipientInfo?.photoURL || '/default-avatar.png'}
                alt={recipientInfo?.name}
                className="w-10 h-10 rounded-full"
              />
              {isOnline && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {recipientInfo?.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {recipientTyping ? (
                  <span className="text-green-600 dark:text-green-400">typing...</span>
                ) : isOnline ? (
                  'online'
                ) : (
                  formatLastSeen(lastSeen)
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500' :
            'bg-red-500'
          }`}></div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((message, index) => {
          const isOwnMessage = message.senderId === session?.user?.id;
          const showAvatar = !isOwnMessage && (
            index === messages.length - 1 || 
            messages[index + 1]?.senderId !== message.senderId
          );
          
          return (
            <div
              key={message.id}
              className={`flex items-end space-x-2 ${
                isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {showAvatar && !isOwnMessage && (
                <img
                  src={recipientInfo?.photoURL || '/default-avatar.png'}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              )}
              
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  isOwnMessage
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                } ${message.status === 'failed' ? 'opacity-50' : ''}`}
              >
                <p className="text-sm break-words">{message.content}</p>
                
                <div className={`flex items-center justify-end space-x-1 mt-1 ${
                  isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  <span className="text-xs">
                    {formatMessageTime(message.timestamp)}
                  </span>
                  {getMessageStatusIcon(message)}
                </div>
              </div>
              
              {showAvatar && isOwnMessage && (
                <div className="w-6 h-6"></div>
              )}
            </div>
          );
        })}
        
        {recipientTyping && (
          <div className="flex items-center space-x-2">
            <img
              src={recipientInfo?.photoURL || '/default-avatar.png'}
              alt=""
              className="w-6 h-6 rounded-full"
            />
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-2xl">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            disabled={connectionStatus !== 'connected'}
          />
          
          <button
            type="submit"
            disabled={!newMessage.trim() || connectionStatus !== 'connected'}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessagingInterface;