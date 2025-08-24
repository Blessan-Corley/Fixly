'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Save,
  Loader,
  AlertCircle,
  X,
  Plus,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  FileText
} from 'lucide-react';
import { useApp, RoleGuard } from '../../../../providers';
import { toast } from 'sonner';
import { searchCities, searchSkills } from '../../../../../data/cities';

export default function EditJobPage({ params }) {
  return (
    <RoleGuard roles={['hirer']} fallback={<div>Access denied</div>}>
      <EditJobContent params={params} />
    </RoleGuard>
  );
}

function EditJobContent({ params }) {
  const { jobId } = params;
  const { user } = useApp();
  const router = useRouter();
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skillsRequired: [],
    budget: {
      type: 'negotiable',
      amount: '',
      materialsIncluded: false
    },
    location: {
      address: '',
      city: '',
      state: '',
      pincode: '',
      lat: null,
      lng: null
    },
    deadline: '',
    urgency: 'flexible',
    type: 'one-time',
    experienceLevel: 'intermediate',
    scheduledDate: '',
    estimatedDuration: {
      value: '',
      unit: 'hours'
    }
  });

  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [originalJob, setOriginalJob] = useState(null);
  
  // Subscription states
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [showProModal, setShowProModal] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Search states
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillResults, setSkillResults] = useState([]);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

  useEffect(() => {
    fetchJobDetails();
    fetchSubscriptionInfo();
  }, [jobId]);

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await fetch('/api/subscription/hirer');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionInfo(data);
      }
    } catch (error) {
      console.error('Error fetching subscription info:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  // City search
  useEffect(() => {
    if (citySearch.length > 0) {
      const results = searchCities(citySearch);
      setCityResults(results);
      setShowCityDropdown(results.length > 0);
    } else {
      setCityResults([]);
      setShowCityDropdown(false);
    }
  }, [citySearch]);

  // Skill search
  useEffect(() => {
    if (skillSearch.length > 0) {
      const results = searchSkills(skillSearch);
      setSkillResults(results);
      setShowSkillDropdown(results.length > 0);
    } else {
      setSkillResults([]);
      setShowSkillDropdown(false);
    }
  }, [skillSearch]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();

      if (response.ok) {
        const job = data.job;
        setOriginalJob(job);
        
        // Populate form with existing job data
        setFormData({
          title: job.title || '',
          description: job.description || '',
          skillsRequired: job.skillsRequired || [],
          budget: {
            type: job.budget?.type || 'negotiable',
            amount: job.budget?.amount || '',
            materialsIncluded: job.budget?.materialsIncluded || false
          },
          location: {
            address: job.location?.address || '',
            city: job.location?.city || '',
            state: job.location?.state || '',
            pincode: job.location?.pincode || '',
            lat: job.location?.lat || null,
            lng: job.location?.lng || null
          },
          deadline: job.deadline ? new Date(job.deadline).toISOString().slice(0, 16) : '',
          urgency: job.urgency || 'flexible',
          type: job.type || 'one-time',
          experienceLevel: job.experienceLevel || 'intermediate',
          scheduledDate: job.scheduledDate ? new Date(job.scheduledDate).toISOString().slice(0, 16) : '',
          estimatedDuration: {
            value: job.estimatedDuration?.value || '',
            unit: job.estimatedDuration?.unit || 'hours'
          }
        });
      } else {
        toast.error(data.message || 'Failed to load job details');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job details');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      }
      return { ...prev, [field]: value };
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 30) {
      newErrors.description = 'Description must be at least 30 characters';
    }

    if (formData.skillsRequired.length === 0) {
      newErrors.skillsRequired = 'At least one skill is required';
    }

    if (formData.budget.type !== 'negotiable' && !formData.budget.amount) {
      newErrors['budget.amount'] = 'Budget amount is required';
    }

    if (!formData.location.address.trim()) {
      newErrors['location.address'] = 'Address is required';
    }

    if (!formData.location.city.trim()) {
      newErrors['location.city'] = 'City is required';
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    } else if (new Date(formData.deadline) <= new Date()) {
      newErrors.deadline = 'Deadline must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      const errorMessages = Object.values(errors).filter(msg => msg);
      if (errorMessages.length > 0) {
        toast.error(`Please fix ${errorMessages.length} error(s) before saving`);
      }
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_details',
          data: formData
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Job updated successfully!');
        router.push(`/dashboard/jobs/${jobId}`);
      } else {
        toast.error(data.message || 'Failed to update job');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = (skill) => {
    if (!formData.skillsRequired.includes(skill)) {
      handleInputChange('skillsRequired', [...formData.skillsRequired, skill]);
    }
    setSkillSearch('');
    setShowSkillDropdown(false);
  };

  const removeSkill = (skillToRemove) => {
    handleInputChange('skillsRequired', formData.skillsRequired.filter(skill => skill !== skillToRemove));
  };

  const selectCity = (city) => {
    handleInputChange('location', {
      address: formData.location.address,
      city: city.name,
      state: city.state,
      pincode: formData.location.pincode,
      lat: city.lat,
      lng: city.lng
    });
    setCitySearch('');
    setShowCityDropdown(false);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="animate-spin h-8 w-8 text-fixly-accent" />
        </div>
      </div>
    );
  }

  if (!originalJob) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-fixly-text mb-2">Job Not Found</h2>
          <p className="text-fixly-text-muted mb-4">The job you're trying to edit doesn't exist or you don't have permission to edit it.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button
            onClick={() => router.push(`/dashboard/jobs/${jobId}`)}
            className="btn-ghost mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job
          </button>
          <div>
            <h1 className="text-2xl font-bold text-fixly-text">Edit Job</h1>
            <p className="text-fixly-text-light">Make changes to your job posting</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card space-y-6"
        >
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-fixly-text mb-2">
              Job Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Fix kitchen sink leak"
              className={`input-field ${errors.title ? 'border-red-500 focus:border-red-500' : ''}`}
              maxLength={100}
            />
            <div className="flex justify-between mt-1">
              {errors.title && (
                <p className="text-red-500 text-sm">{errors.title}</p>
              )}
              <p className="text-xs text-fixly-text-muted ml-auto">
                {formData.title.length}/100
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-fixly-text mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the work in detail..."
              className={`textarea-field h-32 ${errors.description ? 'border-red-500 focus:border-red-500' : ''}`}
              maxLength={2000}
            />
            <div className="flex justify-between mt-1">
              {errors.description && (
                <p className="text-red-500 text-sm">{errors.description}</p>
              )}
              <p className="text-xs text-fixly-text-muted ml-auto">
                {formData.description.length}/2000
              </p>
            </div>
          </div>

          {/* Skills Required */}
          <div>
            <label className="block text-sm font-medium text-fixly-text mb-2">
              Skills Required *
            </label>
            <div className="relative">
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Search and add skills..."
                className="input-field"
                onFocus={() => setShowSkillDropdown(skillResults.length > 0)}
              />
              
              {showSkillDropdown && skillResults.length > 0 && (
                <div className="absolute z-10 w-full bg-fixly-card border border-fixly-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {skillResults.map((skill, index) => (
                    <button
                      key={index}
                      onClick={() => addSkill(skill)}
                      className="w-full text-left px-4 py-2 hover:bg-fixly-hover text-fixly-text"
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.skillsRequired.map((skill, index) => (
                <span key={index} className="skill-chip skill-chip-selected flex items-center">
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            
            {errors.skillsRequired && (
              <p className="text-red-500 text-sm mt-1">{errors.skillsRequired}</p>
            )}
          </div>

          {/* Budget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Budget Type
              </label>
              <select
                value={formData.budget.type}
                onChange={(e) => handleInputChange('budget.type', e.target.value)}
                className="select-field"
              >
                <option value="negotiable">Negotiable</option>
                <option value="fixed">Fixed Amount</option>
                <option value="hourly">Hourly Rate</option>
              </select>
            </div>

            {formData.budget.type !== 'negotiable' && (
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  value={formData.budget.amount}
                  onChange={(e) => handleInputChange('budget.amount', e.target.value)}
                  placeholder="Enter amount"
                  className={`input-field ${errors['budget.amount'] ? 'border-red-500 focus:border-red-500' : ''}`}
                  min="0"
                />
                {errors['budget.amount'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['budget.amount']}</p>
                )}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Address *
              </label>
              <input
                type="text"
                value={formData.location.address}
                onChange={(e) => handleInputChange('location.address', e.target.value)}
                placeholder="Enter full address"
                className={`input-field ${errors['location.address'] ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors['location.address'] && (
                <p className="text-red-500 text-sm mt-1">{errors['location.address']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                City *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={citySearch || formData.location.city}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    if (e.target.value !== formData.location.city) {
                      handleInputChange('location.city', e.target.value);
                    }
                  }}
                  placeholder="Search city"
                  className={`input-field ${errors['location.city'] ? 'border-red-500 focus:border-red-500' : ''}`}
                  onFocus={() => setShowCityDropdown(cityResults.length > 0)}
                />
                
                {showCityDropdown && cityResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-fixly-card border border-fixly-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {cityResults.map((city, index) => (
                      <button
                        key={index}
                        onClick={() => selectCity(city)}
                        className="w-full text-left px-4 py-2 hover:bg-fixly-hover text-fixly-text"
                      >
                        {city.name}, {city.state}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors['location.city'] && (
                <p className="text-red-500 text-sm mt-1">{errors['location.city']}</p>
              )}
            </div>
          </div>

          {/* Deadline & Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Application Deadline *
              </label>
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                className={`input-field ${errors.deadline ? 'border-red-500 focus:border-red-500' : ''}`}
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.deadline && (
                <p className="text-red-500 text-sm mt-1">{errors.deadline}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-fixly-text mb-2">
                Urgency Level
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'asap', label: 'ASAP', desc: 'Within 24 hours', requiresPro: true },
                  { value: 'flexible', label: 'Flexible', desc: 'Within a few days' },
                  { value: 'scheduled', label: 'Scheduled', desc: 'On specific date' }
                ].map(({ value, label, desc, requiresPro }) => {
                  const isPro = subscriptionInfo?.isPro;
                  const canSelect = !requiresPro || isPro;
                  
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        if (requiresPro && !isPro) {
                          setShowProModal(true);
                        } else {
                          handleInputChange('urgency', value);
                        }
                      }}
                      className={`p-4 rounded-lg border-2 transition-colors text-left relative ${
                        formData.urgency === value
                          ? 'border-fixly-accent bg-fixly-accent/10'
                          : canSelect 
                            ? 'border-fixly-border hover:border-fixly-accent'
                            : 'border-fixly-border opacity-60'
                      }`}
                    >
                      <div className="font-medium text-fixly-text">{label}</div>
                      {requiresPro && (
                        <div className="text-xs text-fixly-accent font-medium mt-1">
                          {isPro ? '✓ Pro' : '🔒 Pro Required'}
                        </div>
                      )}
                      <div className="text-sm text-fixly-text-muted">{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t border-fixly-border">
            <button
              onClick={() => router.push(`/dashboard/jobs/${jobId}`)}
              className="btn-ghost"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary flex items-center"
            >
              {saving ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </motion.div>
      </div>

      {/* Pro Modal */}
      {showProModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-fixly-text">Pro Feature Required</h3>
              <button
                onClick={() => setShowProModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-fixly-text-muted mb-3">
                The ASAP urgency option is a Pro feature that helps you get faster responses from fixers.
              </p>
              
              <div className="bg-fixly-accent/10 p-3 rounded-lg mb-4">
                <h4 className="font-medium text-fixly-text mb-2">🚀 Pro Benefits:</h4>
                <ul className="text-sm text-fixly-text-muted space-y-1">
                  <li>• ASAP job posting for urgent needs</li>
                  <li>• Unlimited job posting</li>
                  <li>• Job boosting for more visibility</li>
                  <li>• Priority support</li>
                  <li>• Advanced analytics</li>
                </ul>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowProModal(false)}
                className="btn-ghost flex-1"
              >
                Maybe Later
              </button>
              <button
                onClick={() => {
                  setShowProModal(false);
                  router.push('/dashboard/subscription');
                }}
                className="btn-primary flex-1"
              >
                Upgrade to Pro
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}