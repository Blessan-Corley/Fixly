'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  X,
  CheckCircle,
  Star,
  Tool,
  Zap,
  Award,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

const SkillsSelection = ({
  onSkillsSelect,
  initialSkills = [],
  maxSkills = 10,
  minSkills = 3,
  disabled = false,
  required = true,
  className = ""
}) => {
  const [selectedSkills, setSelectedSkills] = useState(initialSkills);
  const [searchTerm, setSearchTerm] = useState('');
  const [customSkill, setCustomSkill] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Update selectedSkills when initialSkills prop changes
  useEffect(() => {
    setSelectedSkills(initialSkills);
  }, [initialSkills]);

  // Predefined skills categorized by type
  const skillCategories = {
    electrical: {
      name: 'Electrical',
      icon: Zap,
      color: 'yellow',
      skills: [
        'Electrical Wiring', 'Circuit Installation', 'Switch/Socket Repair',
        'Fan Installation', 'Light Fixture Installation', 'Electrical Troubleshooting',
        'Panel Board Maintenance', 'Inverter Installation', 'Motor Repair',
        'Home Automation', 'CCTV Installation', 'Smart Switch Installation'
      ]
    },
    plumbing: {
      name: 'Plumbing',
      icon: Tool,
      color: 'blue',
      skills: [
        'Pipe Installation', 'Leak Repair', 'Drain Cleaning',
        'Faucet Repair', 'Toilet Repair', 'Water Heater Installation',
        'Bathroom Fitting', 'Kitchen Plumbing', 'Sewage Line Repair',
        'Water Pump Installation', 'Pipeline Maintenance', 'Water Filtration'
      ]
    },
    carpentry: {
      name: 'Carpentry',
      icon: Tool,
      color: 'brown',
      skills: [
        'Furniture Repair', 'Door Installation', 'Window Repair',
        'Cabinet Making', 'Shelving Installation', 'Wood Polishing',
        'Furniture Assembly', 'Custom Woodwork', 'Flooring Installation',
        'Deck Building', 'Staircase Repair', 'Wood Restoration'
      ]
    },
    painting: {
      name: 'Painting',
      icon: Award,
      color: 'purple',
      skills: [
        'Interior Painting', 'Exterior Painting', 'Wall Texturing',
        'Waterproofing', 'Color Consultation', 'Spray Painting',
        'Decorative Painting', 'Wall Paper Installation', 'Surface Preparation',
        'Primer Application', 'Ceiling Painting', 'Touch-up Work'
      ]
    },
    hvac: {
      name: 'HVAC',
      icon: TrendingUp,
      color: 'green',
      skills: [
        'AC Installation', 'AC Repair', 'Refrigerator Repair',
        'Heating System Repair', 'Ventilation Installation', 'Duct Cleaning',
        'Thermostat Installation', 'Air Quality Testing', 'System Maintenance',
        'Gas Line Installation', 'Heat Pump Repair', 'Commercial HVAC'
      ]
    },
    appliance: {
      name: 'Appliances',
      icon: Star,
      color: 'red',
      skills: [
        'Washing Machine Repair', 'Microwave Repair', 'Dishwasher Repair',
        'Oven Repair', 'Refrigerator Maintenance', 'Dryer Repair',
        'Small Appliance Repair', 'Kitchen Appliance Installation',
        'Water Purifier Service', 'Chimney Cleaning', 'Induction Repair',
        'Mixer Grinder Repair'
      ]
    },
    technology: {
      name: 'Technology',
      icon: Zap,
      color: 'indigo',
      skills: [
        'WiFi Setup', 'Computer Repair', 'TV Mounting',
        'Home Theater Setup', 'Network Installation', 'Smart Home Setup',
        'Security Camera Installation', 'Printer Setup', 'Data Recovery',
        'Software Installation', 'Internet Troubleshooting', 'Device Setup'
      ]
    },
    general: {
      name: 'General Maintenance',
      icon: Tool,
      color: 'gray',
      skills: [
        'General Handyman', 'Assembly Services', 'Mounting Services',
        'Cleaning Services', 'Moving Services', 'Garden Maintenance',
        'Pest Control', 'Lock Installation', 'Safety Inspections',
        'Maintenance Checks', 'Emergency Repairs', 'Property Maintenance'
      ]
    }
  };

  // Flatten all skills for search
  const allSkills = useMemo(() => {
    return Object.values(skillCategories).flatMap(category =>
      category.skills.map(skill => ({
        name: skill,
        category: category.name,
        color: category.color
      }))
    );
  }, []);

  // Filter skills based on search term and category
  const filteredSkills = useMemo(() => {
    let skills = allSkills;

    if (activeCategory !== 'all') {
      const categoryData = skillCategories[activeCategory];
      if (categoryData) {
        skills = skills.filter(skill => skill.category === categoryData.name);
      }
    }

    if (searchTerm.trim()) {
      skills = skills.filter(skill =>
        skill.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return skills.filter(skill =>
      !selectedSkills.some(selected => selected.name === skill.name)
    );
  }, [allSkills, activeCategory, searchTerm, selectedSkills]);

  // Handle skill selection
  const handleSkillSelect = (skill) => {
    if (selectedSkills.length >= maxSkills) {
      toast.error(`You can select maximum ${maxSkills} skills`);
      return;
    }

    const newSkills = [...selectedSkills, skill];
    setSelectedSkills(newSkills);

    if (onSkillsSelect) {
      onSkillsSelect(newSkills);
    }

    toast.success(`Added "${skill.name}" to your skills`);
  };

  // Handle skill removal
  const handleSkillRemove = (skillToRemove) => {
    const newSkills = selectedSkills.filter(skill => skill.name !== skillToRemove.name);
    setSelectedSkills(newSkills);

    if (onSkillsSelect) {
      onSkillsSelect(newSkills);
    }

    toast.info(`Removed "${skillToRemove.name}" from your skills`);
  };

  // Handle custom skill addition
  const handleCustomSkillAdd = () => {
    if (!customSkill.trim()) return;

    const trimmedSkill = customSkill.trim();

    // Check if skill already exists (case-insensitive across both lists)
    const exists = [...allSkills, ...selectedSkills].some(
      skill => skill.name.toLowerCase() === trimmedSkill.toLowerCase()
    );
    if (exists) {
      toast.error('This skill already exists');
      return;
    }

    if (selectedSkills.length >= maxSkills) {
      toast.error(`You can select maximum ${maxSkills} skills`);
      return;
    }

    const newCustomSkill = {
      name: trimmedSkill,
      category: 'Custom',
      color: 'gray',
      isCustom: true
    };

    const newSkills = [...selectedSkills, newCustomSkill];
    setSelectedSkills(newSkills);
    setCustomSkill('');
    setShowCustomInput(false);

    if (onSkillsSelect) {
      onSkillsSelect(newSkills);
    }

    toast.success(`Added custom skill "${trimmedSkill}"`);
  };

  // Get color classes for skills
  const getSkillColorClasses = (color) => {
    const colorMap = {
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      brown: 'bg-amber-100 text-amber-800 border-amber-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colorMap[color] || colorMap.gray;
  };

  // Validation
  const isValid = selectedSkills.length >= minSkills;

  return (
    <div className={`skills-selection-container ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-2 mb-6">
        <Tool className="h-5 w-5 text-fixly-accent" />
        <h3 className="text-lg font-semibold text-fixly-text">Your Skills</h3>
        <span className="text-sm text-fixly-text-muted">
          ({selectedSkills.length}/{maxSkills})
        </span>
      </div>

      {/* Selected Skills */}
      {selectedSkills.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-fixly-text mb-3">
            Selected Skills ({selectedSkills.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {selectedSkills.map((skill, index) => (
                <motion.div
                  key={`${skill.name}-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-sm ${getSkillColorClasses(skill.color)}`}
                >
                  <span>{skill.name}</span>
                  {skill.isCustom && (
                    <span className="text-xs opacity-60">(Custom)</span>
                  )}
                  <button
                    onClick={() => handleSkillRemove(skill)}
                    disabled={disabled}
                    className="hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fixly-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search skills..."
            disabled={disabled}
            className="input-field pl-10"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-fixly-accent text-white'
                : 'bg-fixly-bg border border-fixly-border text-fixly-text-muted hover:bg-fixly-accent/10'
            }`}
          >
            All Skills
          </button>
          {Object.entries(skillCategories).map(([key, category]) => {
            const IconComponent = category.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === key
                    ? 'bg-fixly-accent text-white'
                    : 'bg-fixly-bg border border-fixly-border text-fixly-text-muted hover:bg-fixly-accent/10'
                }`}
              >
                <IconComponent className="h-3 w-3" />
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills Grid */}
      <div className="space-y-4">
        {filteredSkills.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredSkills.map((skill, index) => (
              <motion.button
                key={`${skill.name}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => handleSkillSelect(skill)}
                disabled={disabled || selectedSkills.length >= maxSkills}
                className="flex items-center justify-between p-3 text-left border border-fixly-border rounded-lg hover:border-fixly-accent hover:bg-fixly-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span className="text-sm text-fixly-text group-hover:text-fixly-accent">
                  {skill.name}
                </span>
                <Plus className="h-4 w-4 text-fixly-text-muted group-hover:text-fixly-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-fixly-text-muted">
            {searchTerm ? (
              <div>
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No skills found matching "{searchTerm}"</p>
                <p className="text-xs mt-1">Try adding it as a custom skill</p>
              </div>
            ) : (
              <div>
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>All skills in this category are selected</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Skill Input */}
      {selectedSkills.length < maxSkills && (
        <div className="mt-6 pt-6 border-t border-fixly-border">
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              disabled={disabled}
              className="flex items-center space-x-2 text-sm text-fixly-accent hover:text-fixly-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              <span>Add Custom Skill</span>
            </button>
          ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <div className="flex space-x-2">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                placeholder="Enter custom skill name"
                disabled={disabled}
                className="input-field flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomSkillAdd();
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleCustomSkillAdd}
                disabled={!customSkill.trim() || disabled}
                className="btn-primary px-4"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomSkill('');
                }}
                className="btn-ghost px-4"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-fixly-text-muted">
              Add skills that aren't listed above. Make sure it's relevant to your services.
            </p>
          </motion.div>
          )}
        </div>
      )}

      {/* Validation Message */}
      {required && selectedSkills.length < minSkills && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-700">
            Please select at least {minSkills} skills to continue.
          </p>
        </div>
      )}
    </div>
  );
};

export default SkillsSelection;