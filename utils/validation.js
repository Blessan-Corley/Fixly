// ============================================
// utils/validation.js - Enhanced Validation & Anti-Abuse
// ============================================

// Blacklisted terms for usernames, names, and locations
const BLACKLISTED_TERMS = [
  // Generic/Temp terms
  'temp', 'temporary', 'test', 'demo', 'example', 'placeholder', 'dummy',
  'fake', 'spam', 'null', 'undefined', 'unknown', 'anonymous', 'guest',
  'user', 'admin', 'system', 'bot', 'default', 'sample', 'trial',
  
  // Inappropriate terms
  'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'bastard', 'crap',
  
  // System reserved
  'fixly', 'support', 'help', 'api', 'www', 'mail', 'root', 'superuser'
];

// Fake/common locations to reject
const FAKE_LOCATIONS = [
  'temp', 'temporary', 'test', 'demo', 'example', 'fake', 'sample',
  'unknown', 'null', 'undefined', 'placeholder', 'dummy', 'xyz',
  'abc', '123', 'city', 'town', 'village', 'place'
];

// Valid Indian phone number prefixes
const VALID_INDIAN_PREFIXES = ['6', '7', '8', '9'];

// Enhanced validation functions
export const ValidationRules = {
  // Name validation
  validateName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, message: 'Name is required' };
    }

    const trimmedName = name.trim();
    
    if (trimmedName.length < 2) {
      return { valid: false, message: 'Name must be at least 2 characters' };
    }

    if (trimmedName.length > 50) {
      return { valid: false, message: 'Name cannot exceed 50 characters' };
    }

    // Check for numbers
    if (/\d/.test(trimmedName)) {
      return { valid: false, message: 'Name cannot contain numbers' };
    }

    // Check for excessive special characters
    if (!/^[a-zA-Z\s\.\-']+$/.test(trimmedName)) {
      return { valid: false, message: 'Name contains invalid characters' };
    }

    // Check for blacklisted terms
    const lowerName = trimmedName.toLowerCase();
    for (const term of BLACKLISTED_TERMS) {
      if (lowerName.includes(term)) {
        return { valid: false, message: 'Please enter your real name' };
      }
    }

    // Check for repeated characters (like "aaaa" or "test test")
    if (/(.)\1{3,}/.test(trimmedName) || /^(.+)\s+\1$/.test(trimmedName)) {
      return { valid: false, message: 'Please enter a valid name' };
    }

    return { valid: true, value: trimmedName };
  },

  // Username validation
  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { valid: false, message: 'Username is required' };
    }

    const trimmedUsername = username.trim().toLowerCase();
    
    if (trimmedUsername.length < 3) {
      return { valid: false, message: 'Username must be at least 3 characters' };
    }

    if (trimmedUsername.length > 20) {
      return { valid: false, message: 'Username cannot exceed 20 characters' };
    }

    // Check format
    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      return { valid: false, message: 'Username can only contain lowercase letters, numbers, and underscores' };
    }

    // Check for blacklisted terms
    for (const term of BLACKLISTED_TERMS) {
      if (trimmedUsername.includes(term)) {
        return { valid: false, message: 'This username is not allowed' };
      }
    }

    // Check for patterns that suggest temp/fake accounts
    if (/^(user|temp|test|demo)\d*$/.test(trimmedUsername)) {
      return { valid: false, message: 'Please choose a unique username' };
    }

    // Check for repeated characters
    if (/(.)\1{3,}/.test(trimmedUsername)) {
      return { valid: false, message: 'Username cannot have repeated characters' };
    }

    return { valid: true, value: trimmedUsername };
  },

  // Email validation
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, message: 'Email is required' };
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    // Basic email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { valid: false, message: 'Please enter a valid email address' };
    }

    // Check for common fake email patterns
    const fakePatterns = [
      /@test\./,
      /@example\./,
      /@temp\./,
      /@fake\./,
      /@dummy\./,
      /test@/,
      /fake@/,
      /temp@/
    ];

    for (const pattern of fakePatterns) {
      if (pattern.test(trimmedEmail)) {
        return { valid: false, message: 'Please use a real email address' };
      }
    }

    return { valid: true, value: trimmedEmail };
  },

  // Phone validation (Indian numbers)
  validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, message: 'Phone number is required' };
    }

    const cleanPhone = phone.replace(/[^\d]/g, '');
    
    if (cleanPhone.length !== 10) {
      return { valid: false, message: 'Phone number must be 10 digits' };
    }

    if (!VALID_INDIAN_PREFIXES.includes(cleanPhone[0])) {
      return { valid: false, message: 'Please enter a valid Indian mobile number' };
    }

    // Check for fake/repeated numbers
    if (/^(\d)\1{9}$/.test(cleanPhone)) {
      return { valid: false, message: 'Please enter a real phone number' };
    }

    // Check for common fake patterns
    const fakePatterns = [
      '0000000000', '1111111111', '2222222222', '3333333333',
      '4444444444', '5555555555', '6666666666', '7777777777',
      '8888888888', '9999999999', '1234567890', '0987654321'
    ];

    if (fakePatterns.includes(cleanPhone)) {
      return { valid: false, message: 'Please enter a real phone number' };
    }

    return { valid: true, value: `+91${cleanPhone}` };
  },

  // Location validation
  validateLocation(location) {
    if (!location || typeof location !== 'object') {
      return { valid: false, message: 'Location is required' };
    }

    if (!location.name || !location.state) {
      return { valid: false, message: 'Please select a valid city and state' };
    }

    const cityName = location.name.toLowerCase().trim();
    const stateName = location.state.toLowerCase().trim();

    // Check for fake location names
    for (const fakeLocation of FAKE_LOCATIONS) {
      if (cityName.includes(fakeLocation) || stateName.includes(fakeLocation)) {
        return { valid: false, message: 'Please select a real location' };
      }
    }

    // Validate that it's not just random text
    if (cityName.length < 2 || stateName.length < 2) {
      return { valid: false, message: 'Please select a valid location' };
    }

    return { 
      valid: true, 
      value: {
        city: location.name.split(',')[0].trim(),
        state: location.state,
        lat: location.lat || 0,
        lng: location.lng || 0
      }
    };
  },

  // Skills validation for fixers
  validateSkills(skills, role) {
    if (role !== 'fixer') {
      return { valid: true, value: [] };
    }

    if (!Array.isArray(skills) || skills.length === 0) {
      return { valid: false, message: 'Fixers must select at least one skill' };
    }

    if (skills.length > 10) {
      return { valid: false, message: 'Maximum 10 skills allowed' };
    }

    const validSkills = [];
    
    for (const skill of skills) {
      if (!skill || typeof skill !== 'string') continue;
      
      const trimmedSkill = skill.trim().toLowerCase();
      
      if (trimmedSkill.length < 2) continue;
      if (trimmedSkill.length > 30) continue;
      
      // Check for inappropriate terms
      let isValid = true;
      for (const term of BLACKLISTED_TERMS) {
        if (trimmedSkill.includes(term)) {
          isValid = false;
          break;
        }
      }
      
      if (isValid && !/^\d+$/.test(trimmedSkill)) {
        validSkills.push(trimmedSkill);
      }
    }

    if (validSkills.length === 0) {
      return { valid: false, message: 'Please select valid skills' };
    }

    return { valid: true, value: validSkills };
  },

  // Password validation
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, message: 'Password is required' };
    }

    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters' };
    }

    if (password.length > 100) {
      return { valid: false, message: 'Password cannot exceed 100 characters' };
    }

    // Check for common weak passwords
    const weakPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'abc123', '111111', 'welcome', 'login', 'user'
    ];

    if (weakPasswords.includes(password.toLowerCase())) {
      return { valid: false, message: 'Please choose a stronger password' };
    }

    return { valid: true, value: password };
  }
};

// Complete form validation
export function validateSignupForm(formData) {
  const errors = {};
  const validatedData = {};

  // Validate name
  const nameValidation = ValidationRules.validateName(formData.name);
  if (!nameValidation.valid) {
    errors.name = nameValidation.message;
  } else {
    validatedData.name = nameValidation.value;
  }

  // Validate username
  const usernameValidation = ValidationRules.validateUsername(formData.username);
  if (!usernameValidation.valid) {
    errors.username = usernameValidation.message;
  } else {
    validatedData.username = usernameValidation.value;
  }

  // Validate email
  const emailValidation = ValidationRules.validateEmail(formData.email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.message;
  } else {
    validatedData.email = emailValidation.value;
  }

  // Validate phone
  const phoneValidation = ValidationRules.validatePhone(formData.phone);
  if (!phoneValidation.valid) {
    errors.phone = phoneValidation.message;
  } else {
    validatedData.phone = phoneValidation.value;
  }

  // Validate location
  const locationValidation = ValidationRules.validateLocation(formData.location);
  if (!locationValidation.valid) {
    errors.location = locationValidation.message;
  } else {
    validatedData.location = locationValidation.value;
  }

  // Validate skills (for fixers)
  const skillsValidation = ValidationRules.validateSkills(formData.skills, formData.role);
  if (!skillsValidation.valid) {
    errors.skills = skillsValidation.message;
  } else {
    validatedData.skills = skillsValidation.value;
  }

  // Validate password (for email auth)
  if (formData.password) {
    const passwordValidation = ValidationRules.validatePassword(formData.password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.message;
    }
  }

  // Validate role
  if (!['hirer', 'fixer'].includes(formData.role)) {
    errors.role = 'Invalid role selected';
  } else {
    validatedData.role = formData.role;
  }

  // Validate terms acceptance
  if (!formData.termsAccepted) {
    errors.terms = 'You must accept the terms and conditions';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    validatedData
  };
}

// Additional utility functions
export function detectFakeAccount(userData) {
  const suspiciousIndicators = [];

  // Check for temp patterns in username
  if (userData.username && userData.username.startsWith('temp_')) {
    suspiciousIndicators.push('Temporary username pattern');
  }

  // Check for placeholder phone
  if (userData.phone === '+919999999999') {
    suspiciousIndicators.push('Placeholder phone number');
  }

  // Check for fake location
  if (userData.location && 
      (userData.location.city.toLowerCase().includes('temp') || 
       userData.location.state.toLowerCase().includes('temp'))) {
    suspiciousIndicators.push('Temporary location');
  }

  return {
    isSuspicious: suspiciousIndicators.length > 0,
    indicators: suspiciousIndicators
  };
}

// Rate limiting helper for specific actions
export function checkActionRateLimit(userId, action, maxActions = 5, windowMs = 60000) {
  const key = `${action}_${userId}`;
  // Implementation would use your existing rate limiting system
  // This is a placeholder for the concept
  return { allowed: true };
}