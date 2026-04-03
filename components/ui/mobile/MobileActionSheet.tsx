'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, type MouseEvent } from 'react';

type ActionVariant = 'default' | 'danger';

export interface MobileActionSheetAction {
  id?: string;
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: ActionVariant;
}

export interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions?: MobileActionSheetAction[];
  className?: string;
}

export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  actions = [],
  className = '',
}: MobileActionSheetProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

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

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`w-full rounded-t-xl bg-fixly-bg shadow-xl ${className}`}
          >
            {title && (
              <div className="border-b border-fixly-border p-4">
                <h3 className="text-center text-lg font-semibold text-fixly-text">{title}</h3>
              </div>
            )}

            <div className="space-y-2 p-4">
              {actions.map((action, index) => {
                const ActionIcon = action.icon;

                return (
                  <button
                    key={action.id ?? `${action.label}-${index}`}
                    onClick={() => {
                      action.onClick();
                      onClose();
                    }}
                    className={`
                      flex w-full items-center space-x-3 rounded-lg p-4 transition-colors
                      ${action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-fixly-text hover:bg-fixly-accent/10'}
                    `}
                  >
                    {ActionIcon && <ActionIcon className="h-5 w-5" />}
                    <span className="font-medium">{action.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="w-full border-t border-fixly-border p-4 text-center text-fixly-text-muted"
            >
              Cancel
            </button>

            <div className="safe-area-pb" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
