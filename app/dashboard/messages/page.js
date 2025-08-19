'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  Filter,
  Phone,
  Video,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  User,
  Clock,
  Check,
  CheckCheck,
  Edit3,
  Trash2,
  Reply,
  Image,
  File,
  Plus,
  ArrowLeft,
  Info,
  Star,
  MapPin,
  DollarSign,
  Loader,
  AlertCircle,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { usePageLoading } from '../../../contexts/LoadingContext';
import { GlobalLoading } from '../../../components/ui/GlobalLoading';

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // URL parameters
  const conversationParam = searchParams.get('conversation');
  const userParam = searchParams.get('user');
  
  // State management
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    loading: pageLoading, 
    showRefreshMessage, 
    startLoading, 
    stopLoading 
  } = usePageLoading('messages');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  
  // Mobile responsive
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationsList, setShowConversationsList] = useState(true);

  // Polling for real-time updates
  const [pollingInterval, setPollingInterval] = useState(null);

  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768 && selectedConversation) {
        setShowConversationsList(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [selectedConversation]);

  // Fetch conversations (background refresh)
  const fetchConversations = async (isInitial = false) => {
    try {
      if (isInitial) {
        startLoading('Loading conversations...');
      }
      const response = await fetch('/api/messages');
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations);
        
        // Auto-select conversation if specified in URL
        if (conversationParam && !selectedConversation) {
          const conversation = data.conversations.find(c => c._id === conversationParam);
          if (conversation) {
            selectConversation(conversation);
          }
        }
      }
    } catch (error) {
      if (isInitial) {
        console.error('Error fetching conversations:', error);
        toast.error('Failed to load conversations');
      }
      // Silent fail for background refreshes
    } finally {
      if (isInitial) {
        setLoading(false);
        stopLoading();
      }
    }
  };

  // Fetch messages for selected conversation (background refresh)
  const fetchMessages = async (conversationId, page = 1, isInitial = false) => {
    try {
      if (isInitial && page === 1) {
        setLoadingMessages(true);
      }
      const response = await fetch(`/api/messages?conversationId=${conversationId}&page=${page}`);
      const data = await response.json();
      
      if (data.success) {
        if (page === 1) {
          setMessages(data.conversation.messages);
          setSelectedConversation(data.conversation);
        } else {
          setMessages(prev => [...data.conversation.messages, ...prev]);
        }
        
        // Scroll to bottom for new messages only on initial load
        if (page === 1 && isInitial) {
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    } catch (error) {
      if (isInitial) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      }
      // Silent fail for background refreshes
    } finally {
      if (isInitial && page === 1) {
        setLoadingMessages(false);
      }
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation._id,
          content: messageContent,
          messageType: 'text'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Add message to local state immediately
        const newMsg = {
          ...data.message,
          sender: {
            _id: session.user.id,
            name: session.user.name,
            username: session.user.username,
            photoURL: session.user.image
          }
        };
        
        setMessages(prev => [...prev, newMsg]);
        scrollToBottom();
        
        // Update conversations list (background)
        fetchConversations(false);
      } else {
        toast.error(data.message || 'Failed to send message');
        setNewMessage(messageContent); // Restore message
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageContent); // Restore message
    } finally {
      setSendingMessage(false);
    }
  };

  // Select conversation
  const selectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    fetchMessages(conversation._id, 1, true);
    
    if (isMobile) {
      setShowConversationsList(false);
    }
    
    // Update URL
    const newUrl = `/dashboard/messages?conversation=${conversation._id}`;
    window.history.replaceState({}, '', newUrl);
  };

  // Start conversation with specific user
  const startConversationWithUser = async (userId) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: userId,
          content: 'Hello! I would like to discuss the job with you.',
          messageType: 'text'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh conversations and select the new one
        await fetchConversations(false);
        const conversation = conversations.find(c => c._id === data.conversationId);
        if (conversation) {
          selectConversation(conversation);
        }
      } else {
        toast.error(data.message || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  // Mark messages as read
  const markAsRead = async (conversationId) => {
    try {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId }),
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Initial load
  useEffect(() => {
    if (session) {
      fetchConversations(true);
      
      // Check if starting conversation with specific user
      if (userParam) {
        startConversationWithUser(userParam);
      }
    }
  }, [session, userParam]);

  // Set up polling for real-time updates (background only)
  useEffect(() => {
    if (selectedConversation && session) {
      const interval = setInterval(async () => {
        setBackgroundRefreshing(true);
        await fetchMessages(selectedConversation._id, 1, false); // Background refresh
        setTimeout(() => setBackgroundRefreshing(false), 500); // Brief indication
      }, 5000); // Poll every 5 seconds (reduced frequency)
      
      setPollingInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [selectedConversation, session]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      markAsRead(selectedConversation._id);
    }
  }, [selectedConversation, messages]);

  if (loading) {
    return (
      <GlobalLoading 
        loading={pageLoading || loading}
        showRefreshMessage={showRefreshMessage}
        message="Loading messages..."
        fullScreen={false}
        className="h-full"
      />
    );
  }

  return (
    <div className="h-full flex bg-white rounded-lg border border-fixly-border overflow-hidden">
      {/* Conversations List */}
      <AnimatePresence>
        {(showConversationsList || !isMobile) && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className={`${isMobile ? 'absolute inset-0 z-10 bg-white' : 'w-1/3 min-w-80'} border-r border-fixly-border flex flex-col`}
          >
            {/* Header */}
            <div className="p-4 border-b border-fixly-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-fixly-text">Messages</h2>
                <button className="p-2 hover:bg-fixly-bg rounded-lg">
                  <Settings className="h-5 w-5 text-fixly-text-light" />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 border border-fixly-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent focus:border-transparent"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-fixly-text-light mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-fixly-text mb-2">
                    No conversations yet
                  </h3>
                  <p className="text-fixly-text-light">
                    Start a conversation by applying to jobs or posting your own
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {conversations
                    .filter(conv => 
                      !searchQuery || 
                      conv.participant?.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((conversation, index) => (
                      <motion.div
                        key={conversation._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?._id === conversation._id
                            ? 'bg-fixly-accent-light'
                            : 'hover:bg-fixly-bg'
                        }`}
                        onClick={() => selectConversation(conversation)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="h-12 w-12 bg-fixly-accent-light rounded-full flex items-center justify-center">
                              {conversation.participant?.photoURL ? (
                                <img
                                  src={conversation.participant.photoURL}
                                  alt={conversation.participant.name}
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-6 w-6 text-fixly-accent" />
                              )}
                            </div>
                            {conversation.participant?.isOnline && (
                              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-fixly-text truncate">
                                {conversation.participant?.name || 'Unknown User'}
                              </h4>
                              <span className="text-xs text-fixly-text-light">
                                {conversation.lastMessage && formatTime(conversation.lastMessage.timestamp)}
                              </span>
                            </div>
                            
                            <p className="text-sm text-fixly-text-light truncate">
                              {conversation.lastMessage 
                                ? `${conversation.lastMessage.sender === 'me' ? 'You: ' : ''}${conversation.lastMessage.content}`
                                : 'No messages yet'
                              }
                            </p>
                            
                            <div className="flex items-center justify-between mt-1">
                              {conversation.relatedJob && (
                                <span className="text-xs text-fixly-accent bg-fixly-accent-light px-2 py-1 rounded-full">
                                  Job Related
                                </span>
                              )}
                              {conversation.unreadCount > 0 && (
                                <span className="bg-fixly-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${isMobile && showConversationsList ? 'hidden' : ''}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-fixly-border bg-white">
              {/* Subtle background refresh indicator */}
              {backgroundRefreshing && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-fixly-accent opacity-70">
                  <div className="h-full bg-fixly-accent-dark animate-pulse"></div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isMobile && (
                    <button
                      onClick={() => setShowConversationsList(true)}
                      className="p-2 hover:bg-fixly-bg rounded-lg"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                  
                  <div className="relative">
                    <div className="h-10 w-10 bg-fixly-accent-light rounded-full flex items-center justify-center">
                      {selectedConversation.participants?.find(p => p._id !== session.user.id)?.photoURL ? (
                        <img
                          src={selectedConversation.participants.find(p => p._id !== session.user.id).photoURL}
                          alt="User"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-fixly-accent" />
                      )}
                    </div>
                    {selectedConversation.participants?.find(p => p._id !== session.user.id)?.isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-fixly-text">
                      {selectedConversation.participants?.find(p => p._id !== session.user.id)?.name || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-fixly-text-light">
                      {selectedConversation.participants?.find(p => p._id !== session.user.id)?.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-fixly-bg rounded-lg">
                    <Phone className="h-5 w-5 text-fixly-text-light" />
                  </button>
                  <button className="p-2 hover:bg-fixly-bg rounded-lg">
                    <Video className="h-5 w-5 text-fixly-text-light" />
                  </button>
                  <button 
                    onClick={() => setShowInfo(!showInfo)}
                    className="p-2 hover:bg-fixly-bg rounded-lg"
                  >
                    <Info className="h-5 w-5 text-fixly-text-light" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-fixly-bg-light">
              {messages.map((message, index) => {
                const isOwn = message.sender._id === session.user.id;
                const showAvatar = index === 0 || messages[index - 1].sender._id !== message.sender._id;
                
                return (
                  <motion.div
                    key={message._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-end space-x-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwn && showAvatar && (
                      <div className="h-8 w-8 bg-fixly-accent-light rounded-full flex items-center justify-center">
                        {message.sender.photoURL ? (
                          <img
                            src={message.sender.photoURL}
                            alt={message.sender.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-fixly-accent" />
                        )}
                      </div>
                    )}
                    {!isOwn && !showAvatar && <div className="w-8" />}
                    
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOwn 
                        ? 'bg-fixly-accent text-white' 
                        : 'bg-white text-fixly-text border border-fixly-border'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <div className={`flex items-center justify-between mt-1 text-xs ${
                        isOwn ? 'text-white/70' : 'text-fixly-text-light'
                      }`}>
                        <span>{formatTime(message.timestamp)}</span>
                        {isOwn && (
                          <div className="flex items-center space-x-1">
                            {message.edited && <Edit3 className="h-3 w-3" />}
                            <CheckCheck className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-fixly-border bg-white">
              <div className="flex items-end space-x-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-fixly-text-light hover:text-fixly-accent hover:bg-fixly-bg rounded-lg"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-2 border border-fixly-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent focus:border-transparent resize-none"
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                </div>
                
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="p-2 bg-fixly-accent text-white rounded-lg hover:bg-fixly-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                // Handle file upload
                console.log('Files selected:', e.target.files);
              }}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-fixly-text-light mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-fixly-text mb-2">
                Select a conversation
              </h3>
              <p className="text-fixly-text-light">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      {showInfo && selectedConversation && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="w-80 border-l border-fixly-border bg-white p-4"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-fixly-text">Conversation Info</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="p-1 hover:bg-fixly-bg rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Participant Info */}
          <div className="space-y-4">
            {selectedConversation.participants
              ?.filter(p => p._id !== session.user.id)
              .map(participant => (
                <div key={participant._id} className="text-center">
                  <div className="h-20 w-20 bg-fixly-accent-light rounded-full flex items-center justify-center mx-auto mb-3">
                    {participant.photoURL ? (
                      <img
                        src={participant.photoURL}
                        alt={participant.name}
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-10 w-10 text-fixly-accent" />
                    )}
                  </div>
                  <h4 className="font-semibold text-fixly-text">{participant.name}</h4>
                  <p className="text-sm text-fixly-text-light">@{participant.username}</p>
                  <div className="flex items-center justify-center mt-2">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm text-fixly-text-light">
                      {participant.rating?.average?.toFixed(1) || 'No rating'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          
          {/* Related Job */}
          {selectedConversation.relatedJob && (
            <div className="mt-6 p-4 bg-fixly-bg rounded-lg">
              <h4 className="font-semibold text-fixly-text mb-2">Related Job</h4>
              <p className="text-sm text-fixly-text-light mb-2">
                {selectedConversation.relatedJob.title}
              </p>
              <div className="flex items-center text-sm text-fixly-text-light">
                <DollarSign className="h-4 w-4 mr-1" />
                {selectedConversation.relatedJob.budget?.amount 
                  ? `₹${selectedConversation.relatedJob.budget.amount.toLocaleString()}`
                  : 'Budget not specified'
                }
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}