'use client';

import { useSSENotifications } from '../../hooks/useSSENotifications';

export default function SimpleNotifications({ userId = 'demo-user' }) {
  const { 
    notifications, 
    connected, 
    error, 
    clearNotifications, 
    markAsRead, 
    unreadCount 
  } = useSSENotifications(userId);
  
  return (
    <div className="fixed top-4 right-4 z-50 bg-white border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">
          Real-time Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      {error && (
        <div className="text-red-500 text-sm mb-2">
          Connection error
        </div>
      )}
      
      {notifications.length === 0 ? (
        <p className="text-gray-500 text-sm">No notifications yet</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notifications.map((notification) => (
            <div 
              key={notification.id}
              className={`p-2 rounded border-l-4 cursor-pointer transition-colors ${
                notification.read 
                  ? 'border-gray-300 bg-gray-50' 
                  : 'border-blue-500 bg-blue-50'
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <h4 className="font-medium text-sm">{notification.title}</h4>
              <p className="text-xs text-gray-600">{notification.message}</p>
              <span className="text-xs text-gray-400">
                {new Date(notification.timestamp || Date.now()).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {notifications.length > 0 && (
        <button 
          onClick={clearNotifications}
          className="mt-3 text-xs text-blue-600 hover:text-blue-800"
        >
          Clear all notifications
        </button>
      )}
    </div>
  );
}