'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  DollarSign,
  Clock,
  FileText,
  Send,
  Loader,
  AlertCircle,
  CheckCircle,
  Package,
  Plus,
  Minus,
  Info,
  Zap,
  Target,
  User,
  Star,
  MapPin
} from 'lucide-react';
import { useApp, RoleGuard } from '../../../../providers';
import { toast } from 'sonner';
import { toastMessages } from '../../../../../utils/toast';
import { usePageLoading } from '../../../../../contexts/LoadingContext';
import { GlobalLoading } from '../../../../../components/ui/GlobalLoading';

export default function JobApplyPage() {
  return (
    <RoleGuard roles={['fixer']} fallback={<div>Access denied</div>}>
      <JobApplyContent />
    </RoleGuard>
  );
}

function JobApplyContent() {
  const { user } = useApp();
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId;
  const { 
    loading: pageLoading, 
    showRefreshMessage: globalShowRefreshMessage, 
    startLoading, 
    stopLoading 
  } = usePageLoading(`job-apply-${jobId}`);

  // State
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    proposedAmount: '',
    timeEstimate: { value: '', unit: 'hours' },
    description: '', // Replaced coverLetter and workPlan with simple description
    materialsIncluded: false,
    materialsList: [],
    requirements: '',
    specialNotes: ''
  });

  // Add material item
  const addMaterialItem = () => {
    setFormData(prev => ({
      ...prev,
      materialsList: [
        ...prev.materialsList,
        { item: '', quantity: 1, estimatedCost: 0 }
      ]
    }));
  };

  // Remove material item
  const removeMaterialItem = (index) => {
    setFormData(prev => ({
      ...prev,
      materialsList: prev.materialsList.filter((_, i) => i !== index)
    }));
  };

  // Update material item
  const updateMaterialItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      materialsList: prev.materialsList.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Fetch job details
  useEffect(() => {
    let timeoutId;
    
    const fetchJob = async () => {
      try {
        setLoading(true);
        setShowRefreshMessage(false);
        startLoading('Loading job details...');
        
        console.log('📋 Fetching job details for:', jobId);
        console.log('👤 Current user:', user?.id, user?.role);
        
        // Show refresh message if loading takes too long
        timeoutId = setTimeout(() => {
          if (loading) {
            setShowRefreshMessage(true);
          }
        }, 5000); // Show message after 5 seconds
        
        const response = await fetch(`/api/jobs/${jobId}?forApplication=true`);
        console.log('📡 API Response status:', response.status);
        
        if (!response.ok) {
          throw new Error('Job not found');
        }
        
        const data = await response.json();
        setJob(data.job);
        
        // Check if user has already applied
        if (data.job.applications) {
          const userApplication = data.job.applications.find(
            app => app.fixer === user?.id
          );
          setHasApplied(!!userApplication);
        }
        
        // Set default proposed amount based on job budget
        if (data.job.budget) {
          let defaultAmount = '';
          if (data.job.budget.type === 'fixed') {
            defaultAmount = data.job.budget.amount?.toString() || '';
          } else if (data.job.budget.type === 'range') {
            defaultAmount = data.job.budget.min?.toString() || '';
          }
          
          setFormData(prev => ({
            ...prev,
            proposedAmount: defaultAmount
          }));
        }
      } catch (error) {
        console.error('Error fetching job:', error);
        console.error('Job ID:', jobId);
        console.error('User:', user);
        toast.error('Failed to load job details: ' + error.message);
        
        // Don't redirect immediately, let user see the error
        setTimeout(() => {
          router.push('/dashboard/browse-jobs');
        }, 3000);
      } finally {
        setLoading(false);
        setShowRefreshMessage(false);
        stopLoading();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    if (jobId) {
      fetchJob();
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [jobId, user, router]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.proposedAmount || !formData.description) {
      toast.error('Please fill in all required fields', {
        description: 'Both amount and description are required to submit your application'
      });
      return;
    }

    // Validate proposed amount
    const amount = parseFloat(formData.proposedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid proposed amount');
      return;
    }

    // For negotiable jobs, require detailed work plan
    if (job.budget.type === 'negotiable' && (!formData.workPlan || formData.workPlan.length < 100)) {
      toast.error('Negotiable jobs require a detailed work plan (at least 100 characters)');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          proposedAmount: amount
        })
      });

      const data = await response.json();

      if (response.ok) {
        toastMessages.job.applied();
        router.push('/dashboard/applications');
      } else {
        if (data.needsUpgrade) {
          toast.error('Upgrade Required', {
            description: data.message,
            action: {
              label: 'Upgrade Now',
              onClick: () => router.push('/dashboard/subscription')
            }
          });
        } else {
          toastMessages.job.applicationFailed(data.message);
        }
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toastMessages.job.applicationFailed('Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <GlobalLoading 
          loading={pageLoading || loading}
          showRefreshMessage={globalShowRefreshMessage || showRefreshMessage}
          message="Loading job application form..."
          fullScreen={false}
          className="min-h-[400px]"
        />
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-fixly-text mb-2">
            Application Already Submitted
          </h1>
          <p className="text-fixly-text-light mb-6">
            You have already applied to this job. You can view your application status in your applications dashboard.
          </p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => router.push('/dashboard/applications')}
              className="btn-primary"
            >
              View Applications
            </button>
            <button
              onClick={() => router.push('/dashboard/browse-jobs')}
              className="btn-secondary"
            >
              Browse More Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-fixly-text mb-2">Job Not Found</h1>
          <button
            onClick={() => router.push('/dashboard/browse-jobs')}
            className="btn-primary"
          >
            Browse Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => router.back()}
          className="mr-4 p-2 text-fixly-text-light hover:text-fixly-text hover:bg-fixly-bg rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-fixly-text">Apply to Job</h1>
          <p className="text-fixly-text-light">Create a compelling proposal to win this job</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Summary Card */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-fixly-text">{job.title}</h2>
                  <div className="flex items-center text-sm text-fixly-text-light mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    {job.location.city}, {job.location.state}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-fixly-text-light">Budget</div>
                  <div className="font-semibold text-fixly-text">
                    {job.budget.type === 'negotiable' 
                      ? 'Negotiable' 
                      : job.budget.type === 'fixed'
                      ? `₹${job.budget.amount?.toLocaleString()}`
                      : `₹${job.budget.min?.toLocaleString()} - ₹${job.budget.max?.toLocaleString()}`
                    }
                  </div>
                </div>
              </div>
              
              {/* Client info */}
              <div className="flex items-center pt-4 border-t border-fixly-border">
                <div className="h-8 w-8 bg-fixly-accent-light rounded-full flex items-center justify-center mr-3">
                  <User className="h-4 w-4 text-fixly-accent" />
                </div>
                <div>
                  <div className="font-medium text-fixly-text">{job.createdBy.name}</div>
                  <div className="flex items-center text-sm text-fixly-text-light">
                    <Star className="h-3 w-3 text-yellow-500 mr-1" />
                    {job.createdBy.rating?.average?.toFixed(1) || 'New'} 
                    ({job.createdBy.rating?.count || 0} reviews)
                  </div>
                </div>
              </div>
            </div>

            {/* Proposed Amount */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <h3 className="text-lg font-semibold text-fixly-text mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Your Proposed Amount *
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.proposedAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, proposedAmount: e.target.value }))}
                    placeholder="Enter your proposed amount"
                    className="input-field"
                    min="1"
                  />
                  {job.budget.type !== 'negotiable' && (
                    <p className="text-sm text-fixly-text-light mt-1">
                      Job budget: {job.budget.type === 'fixed' 
                        ? `₹${job.budget.amount?.toLocaleString()}`
                        : `₹${job.budget.min?.toLocaleString()} - ₹${job.budget.max?.toLocaleString()}`
                      }
                    </p>
                  )}
                </div>

                {/* Time Estimate */}
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Estimated Completion Time
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={formData.timeEstimate.value}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        timeEstimate: { ...prev.timeEstimate, value: e.target.value }
                      }))}
                      placeholder="Duration"
                      className="input-field flex-1"
                      min="1"
                    />
                    <select
                      value={formData.timeEstimate.unit}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        timeEstimate: { ...prev.timeEstimate, unit: e.target.value }
                      }))}
                      className="select-field"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Application Description */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <h3 className="text-lg font-semibold text-fixly-text mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Why are you the right fit? *
              </h3>
              
              <div>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Briefly explain why you're fit for this job and describe the work you'll do to complete this project..."
                  rows={5}
                  maxLength={600}
                  className="textarea-field"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-fixly-text-light">
                    Keep it simple and focused - tell them why you're the right choice
                  </p>
                  <span className="text-sm text-fixly-text-light">
                    {formData.description.length}/600
                  </span>
                </div>
              </div>
            </motion.div>


            {/* Materials */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <h3 className="text-lg font-semibold text-fixly-text mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2 text-orange-600" />
                Materials & Supplies
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.materialsIncluded}
                      onChange={(e) => setFormData(prev => ({ ...prev, materialsIncluded: e.target.checked }))}
                      className="checkbox mr-2"
                    />
                    <span className="text-fixly-text">Materials will be included in my service</span>
                  </label>
                  <p className="text-sm text-fixly-text-light mt-1">
                    Check this if you'll provide all necessary materials and include their cost in your price
                  </p>
                </div>

                {formData.materialsIncluded && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-fixly-text">
                        Materials List
                      </label>
                      <button
                        type="button"
                        onClick={addMaterialItem}
                        className="btn-secondary text-sm flex items-center"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Item
                      </button>
                    </div>
                    
                    {formData.materialsList.map((material, index) => (
                      <div key={index} className="border border-fixly-border rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={material.item}
                              onChange={(e) => updateMaterialItem(index, 'item', e.target.value)}
                              placeholder="Material/item name"
                              className="input-field text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterialItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              placeholder="Qty"
                              min="1"
                              className="input-field text-sm"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              value={material.estimatedCost}
                              onChange={(e) => updateMaterialItem(index, 'estimatedCost', parseFloat(e.target.value) || 0)}
                              placeholder="Cost (₹)"
                              min="0"
                              className="input-field text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <button
                              type="button"
                              onClick={() => removeMaterialItem(index)}
                              className="btn-ghost text-red-500 text-sm p-2 w-full"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {formData.materialsList.length > 0 && (
                      <div className="text-right">
                        <div className="text-sm text-fixly-text-light">
                          Total estimated materials cost: ₹{formData.materialsList.reduce((sum, item) => sum + (item.estimatedCost * item.quantity), 0).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Additional Info */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card"
            >
              <h3 className="text-lg font-semibold text-fixly-text mb-4">Additional Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fixly-text mb-2">
                    Special Requirements or Notes
                  </label>
                  <textarea
                    value={formData.specialNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialNotes: e.target.value }))}
                    placeholder="Any special requirements, tools needed, or additional notes..."
                    rows={3}
                    className="textarea-field"
                  />
                </div>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-fixly-text">Ready to Submit?</h4>
                  <p className="text-sm text-fixly-text-light">
                    Make sure all information is accurate before submitting
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex items-center"
                >
                  {submitting ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit Proposal
                </button>
              </div>
            </motion.div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tips Card */}
          <div className="card">
            <h3 className="text-lg font-semibold text-fixly-text mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-fixly-accent" />
              Pro Tips
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start">
                <div className="bg-green-50 rounded-full p-1 mr-2 mt-0.5">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <p className="text-fixly-text-light">
                  Be specific about your experience with similar projects
                </p>
              </div>
              <div className="flex items-start">
                <div className="bg-green-50 rounded-full p-1 mr-2 mt-0.5">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <p className="text-fixly-text-light">
                  Include realistic timeframes and competitive pricing
                </p>
              </div>
              <div className="flex items-start">
                <div className="bg-green-50 rounded-full p-1 mr-2 mt-0.5">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <p className="text-fixly-text-light">
                  Ask relevant questions to show you understand the project
                </p>
              </div>
            </div>
          </div>

          {/* Credits Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-fixly-text mb-4">Application Credits</h3>
            <div className="text-sm">
              <p className="text-fixly-text-light mb-2">
                You have{' '}
                <span className="font-semibold text-fixly-accent">
                  {user?.plan?.type === 'pro' ? 'unlimited' : Math.max(0, 3 - (user?.plan?.creditsUsed || 0))}
                </span>{' '}
                applications remaining.
              </p>
              {user?.plan?.type !== 'pro' && (
                <div className="bg-fixly-accent-light p-3 rounded-lg">
                  <p className="text-fixly-text font-medium mb-1">Upgrade to Pro</p>
                  <p className="text-fixly-text-light text-xs mb-2">
                    Get unlimited applications plus priority support
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/subscription')}
                    className="btn-primary text-xs w-full"
                  >
                    Upgrade Now
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Job Requirements */}
          {job.skillsRequired?.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-fixly-text mb-4">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skillsRequired.map((skill, index) => {
                  const hasSkill = user?.skills?.includes(skill.toLowerCase());
                  return (
                    <span 
                      key={index}
                      className={`skill-chip text-xs ${hasSkill ? 'skill-chip-selected' : ''}`}
                    >
                      {skill}
                      {hasSkill && <CheckCircle className="h-3 w-3 ml-1" />}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}