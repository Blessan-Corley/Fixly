// app/dashboard/messages/page.js - Create this file

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
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
  User
} from 'lucide-react';

export default function MessagesPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Mock data for now - replace with real API calls
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockConversations = [
        {
          id: 1,
          name: 'John Smith',
          avatar: '/default-avatar.png',
          lastMessage: 'Thanks for the quick fix!',
          timestamp: '2 min ago',
          unread: 2,
          online: true,
          type: session?.user?.role === 'fixer' ? 'client' : 'fixer'
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          avatar: '/default-avatar.png',
          lastMessage: 'When can you start the work?',
          timestamp: '1 hour ago',
          unread: 0,
          online: false,
          type: session?.user?.role === 'fixer' ? 'client' : 'fixer'
        },
        {
          id: 3,
          name: 'Mike Wilson',
          avatar: '/default-avatar.png',
          lastMessage: 'Great work on the plumbing!',
          timestamp: '3 hours ago',
          unread: 1,
          online: true,
          type: session?.user?.role === 'fixer' ? 'client' : 'fixer'
        }
      ];
      
      setConversations(mockConversations);
      setLoading(false);
    }, 1000);
  }, [session]);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedChat) {
      // Add message sending logic here
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fixly-accent"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Conversations List */}
      <div className="w-80 border-r border-fixly-border bg-fixly-card">
        {/* Header */}
        <div className="p-4 border-b border-fixly-border">
          <h1 className="text-xl font-semibold text-fixly-text mb-3">Messages</h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fixly-text-muted" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-fixly-bg border border-fixly-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-fixly-text-muted">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-fixly-text-light" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedChat(conversation)}
                className={`p-4 border-b border-fixly-border cursor-pointer hover:bg-fixly-bg transition-colors ${
                  selectedChat?.id === conversation.id ? 'bg-fixly-accent/10 border-l-4 border-l-fixly-accent' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={conversation.avatar}
                      alt={conversation.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {conversation.online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-fixly-text truncate">
                        {conversation.name}
                      </h3>
                      <span className="text-xs text-fixly-text-muted">
                        {conversation.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-fixly-text-muted truncate">
                        {conversation.lastMessage}
                      </p>
                      {conversation.unread > 0 && (
                        <span className="bg-fixly-accent text-white text-xs rounded-full px-2 py-1">
                          {conversation.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-fixly-border bg-fixly-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedChat.avatar}
                    alt={selectedChat.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h2 className="font-medium text-fixly-text">{selectedChat.name}</h2>
                    <p className="text-sm text-fixly-text-muted">
                      {selectedChat.online ? 'Online' : 'Last seen 2 hours ago'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-fixly-bg rounded-lg">
                    <Phone className="h-5 w-5 text-fixly-text-muted" />
                  </button>
                  <button className="p-2 hover:bg-fixly-bg rounded-lg">
                    <Video className="h-5 w-5 text-fixly-text-muted" />
                  </button>
                  <button className="p-2 hover:bg-fixly-bg rounded-lg">
                    <MoreVertical className="h-5 w-5 text-fixly-text-muted" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-fixly-bg">
              <div className="space-y-4">
                {/* Sample messages - replace with real messages */}
                <div className="flex justify-start">
                  <div className="bg-fixly-card p-3 rounded-lg max-w-xs">
                    <p className="text-fixly-text">Hi! I saw your job posting for plumbing work.</p>
                    <span className="text-xs text-fixly-text-muted">10:30 AM</span>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <div className="bg-fixly-accent p-3 rounded-lg max-w-xs">
                    <p className="text-white">Great! When are you available?</p>
                    <span className="text-xs text-white/80">10:32 AM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-fixly-border bg-fixly-card">
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-fixly-bg rounded-lg">
                  <Paperclip className="h-5 w-5 text-fixly-text-muted" />
                </button>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="w-full px-4 py-2 bg-fixly-bg border border-fixly-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent"
                  />
                  <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-fixly-accent/10 rounded">
                    <Smile className="h-4 w-4 text-fixly-text-muted" />
                  </button>
                </div>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-fixly-accent text-white rounded-lg hover:bg-fixly-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-fixly-bg">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-fixly-text-light mx-auto mb-4" />
              <h3 className="text-lg font-medium text-fixly-text mb-2">
                Select a conversation
              </h3>
              <p className="text-fixly-text-muted">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}