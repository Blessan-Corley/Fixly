'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'default', // 'default', 'danger', 'warning'
  loading = false
}) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <Trash2 className="h-6 w-6 text-red-600" />,
          iconBg: 'bg-red-100',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          titleColor: 'text-red-900'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
          iconBg: 'bg-amber-100',
          confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white',
          titleColor: 'text-amber-900'
        };
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6 text-fixly-accent" />,
          iconBg: 'bg-fixly-accent/10',
          confirmButton: 'bg-fixly-accent hover:bg-fixly-accent-dark text-white',
          titleColor: 'text-fixly-text'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      
      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-fixly-card border border-fixly-border rounded-2xl shadow-fixly-xl max-w-md w-full mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-fixly-border">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${styles.iconBg} mr-3`}>
              {styles.icon}
            </div>
            <h2 className={`text-lg font-semibold ${styles.titleColor}`}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-fixly-accent/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-fixly-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-fixly-text-light leading-relaxed">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 pt-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${styles.confirmButton} ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}