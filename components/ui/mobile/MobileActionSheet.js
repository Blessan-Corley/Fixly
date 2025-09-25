'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  actions = [],
  className = ''
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`w-full bg-fixly-bg rounded-t-xl shadow-xl ${className}`}
          >
            {title && (
              <div className="p-4 border-b border-fixly-border">
                <h3 className="text-lg font-semibold text-fixly-text text-center">
                  {title}
                </h3>
              </div>
            )}

            <div className="p-4 space-y-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    onClose();
                  }}
                  className={`
                    w-full flex items-center space-x-3 p-4 rounded-lg transition-colors
                    ${action.variant === 'danger'
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-fixly-text hover:bg-fixly-accent/10'
                    }
                  `}
                >
                  {action.icon && <action.icon className="h-5 w-5" />}
                  <span className="font-medium">{action.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full p-4 text-center text-fixly-text-muted border-t border-fixly-border"
            >
              Cancel
            </button>

            {/* Safe area padding for iPhone */}
            <div className="safe-area-pb" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}