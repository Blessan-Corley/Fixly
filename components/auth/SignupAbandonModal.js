'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function SignupAbandonModal({ showAbandonDialog, setShowAbandonDialog, confirmAbandonSignup }) {
  return (
    <AnimatePresence>
      {showAbandonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 mx-4"
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
                <X className="h-6 w-6 text-orange-600" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Abandon Signup Process?
              </h3>

              <p className="text-sm text-gray-600 mb-6">
                You have unsaved progress in your signup form. Are you sure you want to leave and lose this information?
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAbandonDialog(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Continue Signup
                </button>
                <button
                  onClick={confirmAbandonSignup}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Yes, Leave
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}