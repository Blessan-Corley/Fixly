'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, Wrench } from 'lucide-react';

export default function RoleSelectionModal({ showRoleSelection, setShowRoleSelection, handleRoleSelect }) {
  const handleSelect = (role) => {
    handleRoleSelect(role);
    setShowRoleSelection(false);
  };

  return (
    <AnimatePresence>
      {showRoleSelection && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowRoleSelection(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-fixly-card rounded-2xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-fixly-text mb-6 text-center">
              Choose Your Role
            </h2>

            <div className="space-y-4">
              <button
                onClick={() => handleSelect('hirer')}
                className="w-full p-6 rounded-xl border-2 border-fixly-border hover:border-fixly-accent transition-colors duration-200 text-left"
              >
                <div className="flex items-center mb-2">
                  <Search className="h-6 w-6 text-fixly-accent mr-3" />
                  <span className="text-xl font-semibold text-fixly-text">I'm a Hirer</span>
                </div>
                <p className="text-fixly-text-light">
                  I need to hire service professionals for my jobs
                </p>
              </button>

              <button
                onClick={() => handleSelect('fixer')}
                className="w-full p-6 rounded-xl border-2 border-fixly-border hover:border-fixly-accent transition-colors duration-200 text-left"
              >
                <div className="flex items-center mb-2">
                  <Wrench className="h-6 w-6 text-fixly-accent mr-3" />
                  <span className="text-xl font-semibold text-fixly-text">I'm a Fixer</span>
                </div>
                <p className="text-fixly-text-light">
                  I provide services and want to find work opportunities
                </p>
              </button>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowRoleSelection(false)}
                className="text-fixly-text-muted hover:text-fixly-text transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}