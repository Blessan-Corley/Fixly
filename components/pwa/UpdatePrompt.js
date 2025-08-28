'use client';

import { useState, useEffect } from 'react';
import { getPWAManager } from '../../lib/pwa/PWAManager';

const UpdatePrompt = ({ 
  className = '',
  position = 'top',
  autoShow = true 
}) => {
  const [pwaManager] = useState(() => getPWAManager());
  const [showPrompt, setShowPrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    const handleUpdateAvailable = (event) => {
      setUpdateInfo(event.detail);
      if (autoShow) {
        setShowPrompt(true);
      }
    };

    const handleUpdateActivated = () => {
      setIsUpdating(false);
      setShowPrompt(false);
      // App will reload automatically
    };

    pwaManager.on('updateAvailable', handleUpdateAvailable);
    pwaManager.on('updateActivated', handleUpdateActivated);

    // Check if update is already available
    const appInfo = pwaManager.getAppInfo();
    if (appInfo.updateAvailable && autoShow) {
      setShowPrompt(true);
    }

    return () => {
      pwaManager.off('updateAvailable', handleUpdateAvailable);
      pwaManager.off('updateActivated', handleUpdateActivated);
    };
  }, [pwaManager, autoShow]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      await pwaManager.applyUpdate();
      // The page will reload automatically when the update is activated
    } catch (error) {
      console.error('Update failed:', error);
      setIsUpdating(false);
      
      // Fallback: reload the page
      window.location.reload();
    }
  };

  const handleLater = () => {
    setShowPrompt(false);
    
    // Show again in 1 hour
    setTimeout(() => {
      setShowPrompt(true);
    }, 60 * 60 * 1000);
  };

  const positionClasses = {
    top: 'top-4 left-4 right-4',
    bottom: 'bottom-4 left-4 right-4',
    center: 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
  };

  if (!showPrompt) return null;

  return (
    <div className={`fixed z-50 ${positionClasses[position]} ${className}`}>
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 max-w-sm mx-auto">
        {/* Update Icon and Info */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              Update Available
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              A new version of Fixly is ready to install with improvements and bug fixes.
            </p>
          </div>
        </div>

        {/* Update Benefits */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center text-sm text-blue-100">
            <span className="mr-2">🐛</span>
            <span>Bug fixes and improvements</span>
          </div>
          <div className="flex items-center text-sm text-blue-100">
            <span className="mr-2">✨</span>
            <span>New features and enhancements</span>
          </div>
          <div className="flex items-center text-sm text-blue-100">
            <span className="mr-2">⚡</span>
            <span>Better performance</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-4">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className={`
              flex-1 px-4 py-2 bg-white text-blue-600 rounded-md font-medium 
              transition-colors hover:bg-blue-50
              ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isUpdating ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Updating...
              </div>
            ) : (
              'Update Now'
            )}
          </button>
          
          <button
            onClick={handleLater}
            disabled={isUpdating}
            className={`
              px-4 py-2 text-white border border-white border-opacity-50 
              rounded-md font-medium transition-colors hover:bg-white hover:bg-opacity-10
              ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            Later
          </button>
        </div>

        {/* Update Progress */}
        {isUpdating && (
          <div className="mt-3">
            <div className="text-xs text-blue-100 mb-1">Applying update...</div>
            <div className="w-full bg-blue-500 rounded-full h-1">
              <div className="bg-white h-1 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Minimal update notification for in-app display
export const UpdateNotification = ({ onUpdate, onDismiss }) => {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              A new version is available. Update now for the latest features and fixes.
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onUpdate}
            className="bg-yellow-400 hover:bg-yellow-500 text-yellow-800 px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Update
          </button>
          <button
            onClick={onDismiss}
            className="text-yellow-700 hover:text-yellow-800 p-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePrompt;