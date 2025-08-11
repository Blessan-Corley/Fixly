'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Search,
  Wrench,
  CheckCircle,
  ArrowRight,
  X,
  Loader
} from 'lucide-react';
import { toast } from 'sonner';
import { searchCities, skillCategories, getSkillSuggestions, getInitialSkillCategories } from '../../../data/cities';

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get user data from URL params (from Google OAuth)
  const [userData, setUserData] = useState({
    email: searchParams.get('email') || '',
    name: searchParams.get('name') || '',
    photoURL: searchParams.get('photo') || '',
    username: '',
    phone: '',
    role: '',
    location: null,
    skills: [],
    authMethod: searchParams.get('provider') || 'email',
    googleId: searchParams.get('googleId') || null
  });

  // UI states
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Search states
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const totalSteps = 3;

  // Username availability check
  useEffect(() => {
    const checkUsername = async () => {
      if (userData.username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      setCheckingUsername(true);
      try {
        const response = await fetch('/api/auth/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: userData.username })
        });
        
        const data = await response.json();
        setUsernameAvailable(data.available);
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [userData.username]);

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

  const handleInputChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addSkill = (skill) => {
    if (!userData.skills.includes(skill)) {
      handleInputChange('skills', [...userData.skills, skill]);
    }
  };

  const removeSkill = (skillToRemove) => {
    handleInputChange('skills', userData.skills.filter(skill => skill !== skillToRemove));
  };

  const selectCity = (city) => {
    handleInputChange('location', city);
    setCitySearch('');
    setShowCityDropdown(false);
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!userData.role) {
          newErrors.role = 'Please select your role';
        }
        break;

      case 2:
        if (!userData.name.trim()) {
          newErrors.name = 'Name is required';
        }
        if (!userData.username.trim()) {
          newErrors.username = 'Username is required';
        } else if (userData.username.length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
          newErrors.username = 'Username can only contain letters, numbers, and underscores';
        } else if (usernameAvailable === false) {
          newErrors.username = 'Username is already taken';
        }
        if (!userData.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        } else if (!/^[6-9]\d{9}$/.test(userData.phone.replace(/\D/g, ''))) {
          newErrors.phone = 'Please enter a valid 10-digit phone number';
        }
        break;

      case 3:
        if (!userData.location) {
          newErrors.location = 'Please select your city';
        }
        if (userData.role === 'fixer' && userData.skills.length === 0) {
          newErrors.skills = 'Please select at least one skill';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          termsAccepted: true,
          // Ensure location is properly formatted
          location: userData.location ? {
            city: userData.location.city,
            state: userData.location.state,
            lat: userData.location.lat,
            lng: userData.location.lng
          } : null,
          // Ensure skills are properly formatted
          skills: userData.role === 'fixer' ? userData.skills : []
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Profile completed successfully!');
        
        // Sign in the user with their chosen method
        if (userData.authMethod === 'google') {
          const result = await signIn('google', {
            callbackUrl: '/dashboard',
            redirect: false
          });
          
          if (result?.ok) {
            router.push('/dashboard');
          }
        } else {
          // For email users, redirect to sign in
          router.push('/auth/signin');
        }
      } else {
        toast.error(data.message || 'Profile setup failed');
      }
    } catch (error) {
      console.error('Profile setup error:', error);
      toast.error('Profile setup failed');
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
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-fixly-text mb-2">
          Choose Your Role
        </h2>
        <p className="text-fixly-text-light">
          How do you plan to use Fixly?
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => handleInputChange('role', 'hirer')}
          className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
            userData.role === 'hirer'
              ? 'border-fixly-accent bg-fixly-accent/10'
              : 'border-fixly-border hover:border-fixly-accent'
          }`}
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
          onClick={() => handleInputChange('role', 'fixer')}
          className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
            userData.role === 'fixer'
              ? 'border-fixly-accent bg-fixly-accent/10'
              : 'border-fixly-border hover:border-fixly-accent'
          }`}
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

      {errors.role && (
        <p className="text-red-500 text-sm text-center">{errors.role}</p>
      )}
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-fixly-text mb-2">
          Personal Information
        </h2>
        <p className="text-fixly-text-light">
          Complete your profile details
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={userData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your full name"
            className="input-field"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Username
          </label>
          <div className="relative">
            <input
              type="text"
              value={userData.username}
              onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
              placeholder="Choose a unique username"
              className="input-field pr-10"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {checkingUsername ? (
                <Loader className="animate-spin h-4 w-4 text-fixly-text-muted" />
              ) : usernameAvailable === true ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : usernameAvailable === false ? (
                <X className="h-4 w-4 text-red-500" />
              ) : null}
            </div>
          </div>
          {errors.username && (
            <p className="text-red-500 text-sm mt-1">{errors.username}</p>
          )}
          {usernameAvailable === true && (
            <p className="text-green-600 text-sm mt-1">Username is available!</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={userData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="Enter your 10-digit phone number"
            className="input-field"
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={userData.email}
            disabled
            className="input-field bg-gray-100 cursor-not-allowed"
          />
          <p className="text-xs text-fixly-text-muted mt-1">
            Email from your Google account
          </p>
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
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-fixly-text mb-2">
          Location & Skills
        </h2>
        <p className="text-fixly-text-light">
          Help us connect you with the right opportunities
        </p>
      </div>

      <div className="space-y-6">
        {/* Location Selection */}
        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            City
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fixly-text-muted" />
            <input
              type="text"
              value={userData.location ? userData.location.name : citySearch}
              onChange={(e) => {
                setCitySearch(e.target.value);
                if (userData.location) {
                  handleInputChange('location', null);
                }
              }}
              placeholder="Search for your city"
              className="input-field pl-10"
              disabled={!!userData.location}
            />
            {userData.location && (
              <button
                onClick={() => {
                  handleInputChange('location', null);
                  setCitySearch('');
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-fixly-text-muted" />
              </button>
            )}
          </div>
          
          {showCityDropdown && (
            <div className="mt-1 bg-fixly-card border border-fixly-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {cityResults.map((city, index) => (
                <button
                  key={index}
                  onClick={() => selectCity(city)}
                  className="w-full px-4 py-2 text-left hover:bg-fixly-accent/10 first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="font-medium text-fixly-text">{city.name}</div>
                  <div className="text-sm text-fixly-text-light">{city.state}</div>
                </button>
              ))}
            </div>
          )}
          
          {errors.location && (
            <p className="text-red-500 text-sm mt-1">{errors.location}</p>
          )}
        </div>

        {/* Smart Skills Selection for Fixers */}
        {userData.role === 'fixer' && (
          <div>
            <label className="block text-sm font-medium text-fixly-text mb-2">
              Skills & Services <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-fixly-text-light mb-4">
              Select at least one skill that matches your expertise. We'll suggest related skills to help you get discovered.
            </p>
            
            {/* Selected Skills */}
            {userData.skills.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-fixly-text mb-2">Your Selected Skills ({userData.skills.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {userData.skills.map((skill, index) => (
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
              </div>
            )}

            {/* Progressive Skill Suggestions */}
            <div className="space-y-4">
              {userData.skills.length === 0 ? (
                // Initial category view for first-time users
                <div>
                  <h4 className="font-medium text-fixly-text mb-3">
                    Popular Categories
                    {errors.skills && (
                      <span className="text-xs text-red-500 ml-2 font-normal">
                        (Please select at least one skill)
                      </span>
                    )}
                  </h4>
                  <div className={`grid grid-cols-2 gap-3 ${errors.skills ? 'ring-2 ring-red-200 rounded-lg p-2' : ''}`}>
                    {getInitialSkillCategories().map((category, index) => (
                      <div key={index} className="p-3 border border-fixly-border rounded-lg hover:border-fixly-accent/50 transition-colors">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">{category.icon}</span>
                          <span className="text-sm font-medium text-fixly-text">{category.name}</span>
                        </div>
                        <div className="space-y-1">
                          {category.topSkills.map((skill, skillIndex) => (
                            <button
                              key={skillIndex}
                              onClick={() => addSkill(skill)}
                              className="block w-full text-left text-xs text-fixly-text-light hover:text-fixly-accent transition-colors"
                            >
                              + {skill}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Smart suggestions based on selected skills
                <div>
                  <h4 className="font-medium text-fixly-text mb-3">
                    Recommended for you
                    <span className="text-xs text-fixly-text-light font-normal ml-2">
                      Based on your selected skills
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getSkillSuggestions(userData.skills, 8).map((skill, index) => (
                      <button
                        key={index}
                        onClick={() => addSkill(skill)}
                        disabled={userData.skills.includes(skill)}
                        className="skill-chip hover:bg-fixly-accent/30 text-sm"
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                  
                  {/* Show more options button */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        // Toggle showing all categories
                        const skillsContainer = document.querySelector('.all-skills-container-onboard');
                        if (skillsContainer) {
                          skillsContainer.style.display = skillsContainer.style.display === 'none' ? 'block' : 'none';
                        }
                      }}
                      className="text-sm text-fixly-accent hover:text-fixly-accent-dark transition-colors"
                    >
                      Browse all skills →
                    </button>
                  </div>
                </div>
              )}

              {/* All Skills (collapsed by default when suggestions are shown) */}
              {userData.skills.length > 0 && (
                <div className="all-skills-container-onboard" style={{ display: 'none' }}>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {skillCategories.slice(0, 6).map((category, categoryIndex) => (
                      <div key={categoryIndex}>
                        <h4 className="font-medium text-fixly-text mb-2 text-sm">{category.category}</h4>
                        <div className="flex flex-wrap gap-2">
                          {category.skills.slice(0, 8).map((skill, skillIndex) => (
                            <button
                              key={skillIndex}
                              onClick={() => addSkill(skill)}
                              disabled={userData.skills.includes(skill)}
                              className={`skill-chip text-xs ${
                                userData.skills.includes(skill)
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:bg-fixly-accent/30'
                              }`}
                            >
                              {skill}
                            </button>
                          ))}
                          {category.skills.length > 8 && (
                            <span className="text-xs text-fixly-text-muted">
                              +{category.skills.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {errors.skills && (
              <p className="text-red-500 text-sm mt-1">{errors.skills}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-fixly-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fixly-text mb-2">
            Complete Your Profile
          </h1>
          <p className="text-fixly-text-light">
            Just a few more steps to get started
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step
                    ? 'bg-fixly-accent text-fixly-text'
                    : 'bg-fixly-border text-fixly-text-muted'
                }`}
              >
                {currentStep > step ? <CheckCircle className="h-4 w-4" /> : step}
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

        {/* Form Card */}
        <div className="card min-h-[400px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Navigation Buttons */}
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
                <ArrowRight className="h-4 w-4 ml-2" />
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
                Complete Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}