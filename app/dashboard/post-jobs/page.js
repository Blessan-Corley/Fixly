'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Upload,
  X,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader,
  Plus,
  Minus,
  Search
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';
import { searchCities, skillCategories, searchSkills } from '../../../data/cities';

export default function PostJobPage() {
  return (
    <RoleGuard roles={['hirer']} fallback={<div>Access denied</div>}>
      <PostJobContent />
    </RoleGuard>
  );
}

function PostJobContent() {
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
    },
    attachments: []
  });

  // UI states
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Search states
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillResults, setSkillResults] = useState([]);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

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

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const keys = field.split('.');
        const newData = { ...prev };
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newData;
      }
      return { ...prev, [field]: value };
    });

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
      ...formData.location,
      city: city.name,
      state: city.state,
      lat: city.lat,
      lng: city.lng
    });
    setCitySearch('');
    setShowCityDropdown(false);
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
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
        break;

      case 2:
        if (formData.budget.type !== 'negotiable' && !formData.budget.amount) {
          newErrors['budget.amount'] = 'Budget amount is required';
        }

        if (!formData.location.address.trim()) {
          newErrors['location.address'] = 'Address is required';
        }

        if (!formData.location.city.trim()) {
          newErrors['location.city'] = 'City is required';
        }

        if (formData.location.pincode && !/^[0-9]{6}$/.test(formData.location.pincode)) {
          newErrors['location.pincode'] = 'Invalid pincode format';
        }
        break;

      case 3:
        if (!formData.deadline) {
          newErrors.deadline = 'Deadline is required';
        } else if (new Date(formData.deadline) <= new Date()) {
          newErrors.deadline = 'Deadline must be in the future';
        }

        if (formData.scheduledDate && new Date(formData.scheduledDate) <= new Date()) {
          newErrors.scheduledDate = 'Scheduled date must be in the future';
        }
        break;

      case 4:
        // Final validation
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/jobs/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Job posted successfully!');
        router.push(`/dashboard/jobs/${data.job._id}`);
      } else {
        toast.error(data.message || 'Failed to post job');
      }
    } catch (error) {
      console.error('Error posting job:', error);
      toast.error('Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-fixly-text mb-4">
          Job Details
        </h2>
        <p className="text-fixly-text-light mb-6">
          Provide clear details about what you need done
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Job Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="e.g., Fix kitchen sink leak"
          className="input-field"
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

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe the work in detail. Include what needs to be done, any specific requirements, and what materials are needed..."
          className="textarea-field h-32"
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

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Skills Required *
        </label>
        
        {/* Selected Skills */}
        {formData.skillsRequired.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {formData.skillsRequired.map((skill, index) => (
              <span
                key={index}
                className="skill-chip skill-chip-selected"
              >
                {skill}
                <button
                  onClick={() => removeSkill(skill)}
                  className="ml-2 hover:text-fixly-text"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Skill Categories */}
        <div className="space-y-4">
          {skillCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h4 className="font-medium text-fixly-text mb-2">{category.category}</h4>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill, skillIndex) => (
                  <button
                    key={skillIndex}
                    onClick={() => addSkill(skill)}
                    disabled={formData.skillsRequired.includes(skill)}
                    className={`skill-chip ${
                      formData.skillsRequired.includes(skill)
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-fixly-accent/30'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {errors.skillsRequired && (
          <p className="text-red-500 text-sm mt-2">{errors.skillsRequired}</p>
        )}
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-fixly-text mb-4">
          Budget & Location
        </h2>
        <p className="text-fixly-text-light mb-6">
          Set your budget and specify the job location
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Budget Type *
        </label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'fixed', label: 'Fixed Price', icon: DollarSign },
            { value: 'hourly', label: 'Per Hour', icon: Clock },
            { value: 'negotiable', label: 'Negotiable', icon: AlertCircle }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleInputChange('budget.type', value)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                formData.budget.type === value
                  ? 'border-fixly-accent bg-fixly-accent/10'
                  : 'border-fixly-border hover:border-fixly-accent'
              }`}
            >
              <Icon className="h-6 w-6 text-fixly-accent mx-auto mb-2" />
              <div className="font-medium text-fixly-text">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {formData.budget.type !== 'negotiable' && (
        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Budget Amount (₹) *
          </label>
          <input
            type="number"
            value={formData.budget.amount}
            onChange={(e) => handleInputChange('budget.amount', e.target.value)}
            placeholder="Enter amount"
            className="input-field"
            min="1"
          />
          {errors['budget.amount'] && (
            <p className="text-red-500 text-sm mt-1">{errors['budget.amount']}</p>
          )}
        </div>
      )}

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.budget.materialsIncluded}
            onChange={(e) => handleInputChange('budget.materialsIncluded', e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm text-fixly-text">
            Materials and supplies included in budget
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Complete Address *
        </label>
        <textarea
          value={formData.location.address}
          onChange={(e) => handleInputChange('location.address', e.target.value)}
          placeholder="Enter the complete address where work needs to be done"
          className="textarea-field h-20"
        />
        {errors['location.address'] && (
          <p className="text-red-500 text-sm mt-1">{errors['location.address']}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-fixly-text mb-2">
            City *
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
            <input
              type="text"
              value={formData.location.city || citySearch}
              onChange={(e) => {
                setCitySearch(e.target.value);
                if (formData.location.city) {
                  handleInputChange('location.city', '');
                }
              }}
              placeholder="Search for your city"
              className="input-field pl-10"
            />
          </div>
          
          {showCityDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-fixly-card border border-fixly-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {cityResults.map((city, index) => (
                <button
                  key={index}
                  onClick={() => selectCity(city)}
                  className="w-full px-4 py-2 text-left hover:bg-fixly-accent/10"
                >
                  <div className="font-medium text-fixly-text">{city.name}</div>
                  <div className="text-sm text-fixly-text-light">{city.state}</div>
                </button>
              ))}
            </div>
          )}
          
          {errors['location.city'] && (
            <p className="text-red-500 text-sm mt-1">{errors['location.city']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Pincode
          </label>
          <input
            type="text"
            value={formData.location.pincode}
            onChange={(e) => handleInputChange('location.pincode', e.target.value)}
            placeholder="6-digit pincode"
            className="input-field"
            maxLength={6}
          />
          {errors['location.pincode'] && (
            <p className="text-red-500 text-sm mt-1">{errors['location.pincode']}</p>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-fixly-text mb-4">
          Timing & Requirements
        </h2>
        <p className="text-fixly-text-light mb-6">
          When do you need this work completed?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Deadline *
          </label>
          <input
            type="datetime-local"
            value={formData.deadline}
            onChange={(e) => handleInputChange('deadline', e.target.value)}
            className="input-field"
            min={new Date().toISOString().slice(0, 16)}
          />
          {errors.deadline && (
            <p className="text-red-500 text-sm mt-1">{errors.deadline}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Scheduled Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={formData.scheduledDate}
            onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
            className="input-field"
            min={new Date().toISOString().slice(0, 16)}
          />
          {errors.scheduledDate && (
            <p className="text-red-500 text-sm mt-1">{errors.scheduledDate}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Urgency
        </label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'asap', label: 'ASAP', desc: 'Within 24 hours' },
            { value: 'flexible', label: 'Flexible', desc: 'Within a few days' },
            { value: 'scheduled', label: 'Scheduled', desc: 'On specific date' }
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => handleInputChange('urgency', value)}
              className={`p-4 rounded-lg border-2 transition-colors text-left ${
                formData.urgency === value
                  ? 'border-fixly-accent bg-fixly-accent/10'
                  : 'border-fixly-border hover:border-fixly-accent'
              }`}
            >
              <div className="font-medium text-fixly-text">{label}</div>
              <div className="text-sm text-fixly-text-muted">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Job Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="select-field"
          >
            <option value="one-time">One-time Job</option>
            <option value="recurring">Recurring Job</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Experience Level
          </label>
          <select
            value={formData.experienceLevel}
            onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
            className="select-field"
          >
            <option value="beginner">Beginner (Entry Level)</option>
            <option value="intermediate">Intermediate (Some Experience)</option>
            <option value="expert">Expert (Highly Experienced)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Estimated Duration
        </label>
        <div className="flex gap-4">
          <input
            type="number"
            value={formData.estimatedDuration.value}
            onChange={(e) => handleInputChange('estimatedDuration.value', e.target.value)}
            placeholder="Duration"
            className="input-field flex-1"
            min="1"
          />
          <select
            value={formData.estimatedDuration.unit}
            onChange={(e) => handleInputChange('estimatedDuration.unit', e.target.value)}
            className="select-field w-32"
          >
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
          </select>
        </div>
      </div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-fixly-text mb-4">
          Review & Submit
        </h2>
        <p className="text-fixly-text-light mb-6">
          Review your job details before posting
        </p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-fixly-text mb-4">Job Summary</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-fixly-text">{formData.title}</h4>
            <p className="text-fixly-text-muted text-sm mt-1">
              {formData.description.substring(0, 200)}...
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Skills:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.skillsRequired.map((skill, index) => (
                  <span key={index} className="skill-chip text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="font-medium">Budget:</span>
              <p className="text-fixly-text-muted">
                {formData.budget.type === 'negotiable'
                  ? 'Negotiable'
                  : `₹${formData.budget.amount} (${formData.budget.type})`
                }
              </p>
            </div>

            <div>
              <span className="font-medium">Location:</span>
              <p className="text-fixly-text-muted">
                {formData.location.city}, {formData.location.state}
              </p>
            </div>

            <div>
              <span className="font-medium">Deadline:</span>
              <p className="text-fixly-text-muted">
                {new Date(formData.deadline).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800">
              Rate Limit Notice
            </p>
            <p className="text-yellow-700 mt-1">
              You can post another job in 6 hours after this one to maintain platform quality.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                currentStep >= step
                  ? 'bg-fixly-accent text-fixly-text'
                  : 'bg-fixly-border text-fixly-text-muted'
              }`}
            >
              {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
            </div>
          ))}
        </div>
        <div className="h-2 bg-fixly-border rounded-full">
          <div 
            className="h-full bg-fixly-accent rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Form content */}
      <div className="card min-h-[500px]">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        {currentStep > 1 && (
          <button
            onClick={handlePrevious}
            className="btn-ghost flex items-center"
          >
            Previous
          </button>
        )}
        
        <div className="ml-auto">
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="btn-primary flex items-center"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex items-center"
            >
              {loading ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : null}
              Post Job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}