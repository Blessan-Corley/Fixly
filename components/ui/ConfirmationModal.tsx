'use client';

import { AlertCircle, type LucideIcon } from 'lucide-react';

import ConfirmModal from './ConfirmModal';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
  icon: Icon = AlertCircle,
  iconColor = 'text-red-600',
}: ConfirmationModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={message}
      confirmText={confirmText}
      cancelText={cancelText}
      autoCloseOnConfirm
      customIcon={<Icon className={`h-6 w-6 ${iconColor}`} />}
      customIconBg="bg-red-50"
      customConfirmButtonClass={`text-white ${confirmButtonClass}`}
      customTitleColor="text-fixly-text"
    />
  );
}
