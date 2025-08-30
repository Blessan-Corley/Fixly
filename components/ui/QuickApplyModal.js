'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  DollarSign,
  Clock,
  Package,
  Send,
  Loader,
  Plus,
  Minus,
  Info,
  Zap,
  CheckCircle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function QuickApplyModal({ 
  job, 
  user, 
  isOpen, 
  onClose, 
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [budgetMode, setBudgetMode] = useState('simple'); // 'simple' or 'detailed'
  const [formData, setFormData] = useState({
    // Simple mode
    totalBudget: job?.budget?.amount?.toString() || '',
    
    // Detailed mode  
    workBudget: '',
    materialsBudget: '',
    
    // Common fields
    timeEstimate: '',
    timeUnit: 'hours',
    description: '',
    materialsIncluded: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    const totalAmount = budgetMode === 'simple' 
      ? parseFloat(formData.totalBudget)
      : parseFloat(formData.workBudget || 0) + parseFloat(formData.materialsBudget || 0);
      
    if (!totalAmount || totalAmount <= 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }

    setLoading(true);

    try {
      const applicationData = {
        proposedAmount: totalAmount,
        budgetBreakdown: budgetMode === 'detailed' ? {
          workCost: parseFloat(formData.workBudget || 0),
          materialsCost: parseFloat(formData.materialsBudget || 0),
          total: totalAmount
        } : null,
        timeEstimate: formData.timeEstimate ? {
          value: parseInt(formData.timeEstimate),
          unit: formData.timeUnit
        } : null,
        description: formData.description.trim() || `Hi! I'm interested in your job "${job.title}". I can complete this work professionally and on time.`,
        materialsIncluded: formData.materialsIncluded,
        quickApply: true
      };

      const response = await fetch(`/api/jobs/${job._id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Application sent successfully! 🎉', {
          description: 'The hirer will review your proposal and get back to you.'
        });
        onSuccess?.();
        onClose();
      } else {
        if (data.needsUpgrade) {
          toast.error('Upgrade Required', {
            description: data.message,
            action: {
              label: 'Upgrade Now',
              onClick: () => window.location.href = '/dashboard/subscription'
            }
          });
        } else {
          toast.error(data.message || 'Failed to submit application');
        }
      }
    } catch (error) {
      console.error('Quick apply error:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalBudget = budgetMode === 'simple' 
    ? parseFloat(formData.totalBudget || 0)
    : parseFloat(formData.workBudget || 0) + parseFloat(formData.materialsBudget || 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Quick Apply</h3>
                  <p className="text-sm text-gray-600 mt-1">Send your proposal for "{job?.title}"</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Job Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">{job?.title}</h4>
                      <p className="text-sm text-blue-700">
                        {job?.location?.city}, {job?.location?.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-blue-600">Client Budget</div>
                      <div className="font-semibold text-blue-900">
                        {job?.budget?.type === 'fixed' 
                          ? formatCurrency(job.budget.amount)
                          : job?.budget?.type === 'range'
                          ? `${formatCurrency(job.budget.min)} - ${formatCurrency(job.budget.max)}`
                          : 'Negotiable'
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Budget Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                      Your Proposal
                    </h4>
                    
                    <div className="flex rounded-lg bg-gray-100 p-1">
                      <button
                        type="button"
                        onClick={() => setBudgetMode('simple')}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          budgetMode === 'simple' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Simple
                      </button>
                      <button
                        type="button"
                        onClick={() => setBudgetMode('detailed')}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          budgetMode === 'detailed' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Detailed
                      </button>
                    </div>
                  </div>

                  {budgetMode === 'simple' ? (
                    // Simple Budget Mode
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Amount (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.totalBudget}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalBudget: e.target.value }))}
                        placeholder="Enter your total price"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        This includes all work and materials (if any)
                      </p>
                    </div>
                  ) : (
                    // Detailed Budget Mode  
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Work/Labor Cost (₹)
                          </label>
                          <input
                            type="number"
                            value={formData.workBudget}
                            onChange={(e) => setFormData(prev => ({ ...prev, workBudget: e.target.value }))}
                            placeholder="Your work cost"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Materials Cost (₹)
                          </label>
                          <input
                            type="number"
                            value={formData.materialsBudget}
                            onChange={(e) => setFormData(prev => ({ ...prev, materialsBudget: e.target.value }))}
                            placeholder="Materials cost (optional)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                          />
                        </div>
                      </div>
                      
                      {totalBudget > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-green-800 font-medium">Total Proposal:</span>
                            <span className="text-xl font-bold text-green-900">
                              {formatCurrency(totalBudget)}
                            </span>
                          </div>
                          {formData.workBudget && formData.materialsBudget && (
                            <div className="text-sm text-green-700 mt-1">
                              Work: {formatCurrency(parseFloat(formData.workBudget))} + 
                              Materials: {formatCurrency(parseFloat(formData.materialsBudget))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Time Estimate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    How long will it take? (optional)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={formData.timeEstimate}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeEstimate: e.target.value }))}
                      placeholder="Duration"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                    <select
                      value={formData.timeUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeUnit: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                </div>

                {/* Materials Checkbox */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.materialsIncluded}
                      onChange={(e) => setFormData(prev => ({ ...prev, materialsIncluded: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 flex items-center">
                      <Package className="h-4 w-4 mr-1" />
                      I'll provide all necessary materials
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Check this if you'll supply materials and they're included in your price
                  </p>
                </div>

                {/* Message (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message to Client (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add a personal message to make your application stand out..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    maxLength={300}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      Optional - we'll send a professional message if you leave this blank
                    </p>
                    <span className="text-xs text-gray-400">
                      {formData.description.length}/300
                    </span>
                  </div>
                </div>

                {/* Tips & Credit Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Zap className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h5 className="font-medium text-blue-800">💡 Quick Tips</h5>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Competitive pricing increases your chances</li>
                        <li>• Add a personal message to stand out</li>
                        <li>• Be realistic with time estimates</li>
                      </ul>
                      <div className="mt-3 pt-2 border-t border-blue-200">
                        <p className="text-sm text-blue-700">
                          You have{' '}
                          <span className="font-semibold">
                            {user?.plan?.type === 'pro' ? 'unlimited' : Math.max(0, 3 - (user?.plan?.creditsUsed || 0))}
                          </span>{' '} applications remaining
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      window.location.href = `/dashboard/jobs/${job?._id}/apply`;
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Detailed Form
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || totalBudget <= 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Proposal
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}