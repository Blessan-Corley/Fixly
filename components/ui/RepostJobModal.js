'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, DollarSign, Calendar, AlertCircle } from 'lucide-react';

export default function RepostJobModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  job,
  loading = false
}) {
  const [formData, setFormData] = useState({
    budgetType: job?.budget?.type || 'fixed',
    budgetAmount: job?.budget?.amount || '',
    deadline: '',
    title: job?.title ? `${job.title} (Reposted)` : ''
  });
  
  const [errors, setErrors] = useState({});

  // Set default deadline to 7 days from now
  useState(() => {
    if (isOpen) {
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 7);
      setFormData(prev => ({
        ...prev,
        deadline: defaultDeadline.toISOString().slice(0, 16)
      }));
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }

    if (formData.budgetType === 'fixed') {
      if (!formData.budgetAmount || isNaN(formData.budgetAmount) || formData.budgetAmount <= 0) {
        newErrors.budgetAmount = 'Please enter a valid budget amount';
      }
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    } else if (new Date(formData.deadline) <= new Date()) {
      newErrors.deadline = 'Deadline must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onConfirm({
        ...formData,
        budgetAmount: formData.budgetType === 'negotiable' ? null : parseFloat(formData.budgetAmount)
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

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
        className="relative bg-fixly-card border border-fixly-border rounded-2xl shadow-fixly-xl max-w-lg w-full mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-fixly-border">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-100 mr-3">
              <RotateCcw className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-fixly-text">
              Repost Job
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-fixly-text mb-2">
              Job Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`input-field ${errors.title ? 'border-red-500' : ''}`}
              placeholder="Enter job title"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-fixly-text mb-2">
              Budget
            </label>
            <div className="space-y-3">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="fixed"
                    checked={formData.budgetType === 'fixed'}
                    onChange={(e) => handleInputChange('budgetType', e.target.value)}
                    className="mr-2"
                  />
                  Fixed Price
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="negotiable"
                    checked={formData.budgetType === 'negotiable'}
                    onChange={(e) => handleInputChange('budgetType', e.target.value)}
                    className="mr-2"
                  />
                  Negotiable
                </label>
              </div>

              {formData.budgetType === 'fixed' && (
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
                  <input
                    type="number"
                    value={formData.budgetAmount}
                    onChange={(e) => handleInputChange('budgetAmount', e.target.value)}
                    className={`input-field pl-10 ${errors.budgetAmount ? 'border-red-500' : ''}`}
                    placeholder="Enter amount in ₹"
                    min="1"
                  />
                </div>
              )}
            </div>
            {errors.budgetAmount && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.budgetAmount}
              </p>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-fixly-text mb-2">
              New Deadline
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                className={`input-field pl-10 ${errors.deadline ? 'border-red-500' : ''}`}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            {errors.deadline && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.deadline}
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Repost Information</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Your job will be reposted with updated details</li>
                  <li>Previous applications will not be carried over</li>
                  <li>The job will appear as a new posting to fixers</li>
                </ul>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 pt-0 border-t border-fixly-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Reposting...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Repost Job
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}