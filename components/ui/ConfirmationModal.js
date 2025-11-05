import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

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
  iconColor = 'text-red-600'
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-fixly-card rounded-xl shadow-2xl border border-fixly-border max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full bg-red-50 ${iconColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-fixly-text">
                    {title}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-fixly-accent/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-fixly-text-muted" />
                </button>
              </div>

              {/* Message */}
              <p className="text-fixly-text-light mb-6 ml-14">
                {message}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-fixly-border hover:bg-fixly-accent/10 text-fixly-text font-medium transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${confirmButtonClass}`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
