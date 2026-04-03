'use client';

import { X, AlertTriangle, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/primitives/Dialog';

type ConfirmModalType = 'default' | 'danger' | 'warning';

interface TypeStyles {
  icon: ReactNode;
  iconBg: string;
  confirmButton: string;
  titleColor: string;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmModalType;
  loading?: boolean;
  autoCloseOnConfirm?: boolean;
  customIcon?: ReactNode;
  customIconBg?: string;
  customConfirmButtonClass?: string;
  customTitleColor?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'default',
  loading = false,
  autoCloseOnConfirm = false,
  customIcon,
  customIconBg,
  customConfirmButtonClass,
  customTitleColor,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getTypeStyles = (): TypeStyles => {
    switch (type) {
      case 'danger':
        return {
          icon: <Trash2 className="h-6 w-6 text-red-600" />,
          iconBg: 'bg-red-100',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          titleColor: 'text-red-900',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
          iconBg: 'bg-amber-100',
          confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white',
          titleColor: 'text-amber-900',
        };
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6 text-fixly-accent" />,
          iconBg: 'bg-fixly-accent/10',
          confirmButton: 'bg-fixly-accent hover:bg-fixly-accent-dark text-white',
          titleColor: 'text-fixly-text',
        };
    }
  };

  const styles = getTypeStyles();
  const iconNode = customIcon ?? styles.icon;
  const iconBgClass = customIconBg ?? styles.iconBg;
  const confirmButtonClass = customConfirmButtonClass ?? styles.confirmButton;
  const titleColorClass = customTitleColor ?? styles.titleColor;

  const handleConfirm = (): void => {
    onConfirm();
    if (autoCloseOnConfirm) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-md overflow-hidden rounded-2xl border border-fixly-border bg-fixly-card p-0">
        <DialogHeader className="flex-row items-center justify-between border-b border-fixly-border p-6">
          <div className="flex items-center">
            <div className={`mr-3 rounded-lg p-2 ${iconBgClass}`}>{iconNode}</div>
            <DialogTitle className={`text-lg ${titleColorClass}`}>{title}</DialogTitle>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-fixly-accent/10"
          >
            <X className="h-5 w-5 text-fixly-text-muted" />
          </button>
        </DialogHeader>

        <DialogDescription className="p-6 leading-relaxed text-fixly-text-light">
          {description}
        </DialogDescription>

        <DialogFooter className="space-x-3 p-6 pt-0">
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary">
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 font-medium transition-all duration-200 ${confirmButtonClass} ${
              loading ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
