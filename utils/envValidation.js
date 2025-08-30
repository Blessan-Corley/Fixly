// utils/envValidation.js - Comprehensive environment variable validation
class EnvValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

// Required environment variables for different deployment stages
const REQUIRED_ENV_VARS = {
  // Always required
  ESSENTIAL: [
    'NODE_ENV',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'MONGODB_URI'
  ],
  
  // Required for production
  PRODUCTION: [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ],
  
  // Required if features are enabled
  CONDITIONAL: {
    // Firebase features
    firebase: [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'FIREBASE_ADMIN_PROJECT_ID',
      'FIREBASE_ADMIN_CLIENT_EMAIL',
      'FIREBASE_ADMIN_PRIVATE_KEY'
    ],
    
    // SMS features (Twilio)
    sms: [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER'
    ],
    
    // File upload features (Cloudinary)
    uploads: [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET'
    ],
    
    // Email features
    email: [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS'
    ],
    
    // Redis caching
    redis: [
      'REDIS_URL'
    ],
    
    // Analytics
    analytics: [
      'GOOGLE_ANALYTICS_ID'
    ]
  }
};

// Validation rules for environment variables
const ENV_VALIDATION_RULES = {
  NODE_ENV: {
    required: true,
    values: ['development', 'production', 'test'],
    description: 'Application environment'
  },
  
  NEXTAUTH_URL: {
    required: true,
    pattern: /^https?:\/\/.+/,
    description: 'NextAuth.js callback URL'
  },
  
  NEXTAUTH_SECRET: {
    required: true,
    minLength: 32,
    description: 'NextAuth.js secret key (min 32 characters)'
  },
  
  MONGODB_URI: {
    required: true,
    pattern: /^mongodb(\+srv)?:\/\/.+/,
    description: 'MongoDB connection string'
  },
  
  GOOGLE_CLIENT_ID: {
    required: process.env.NODE_ENV === 'production',
    pattern: /^[0-9]+-[a-zA-Z0-9_]+\.apps\.googleusercontent\.com$/,
    description: 'Google OAuth client ID'
  },
  
  GOOGLE_CLIENT_SECRET: {
    required: process.env.NODE_ENV === 'production',
    minLength: 20,
    description: 'Google OAuth client secret'
  },
  
  FIREBASE_ADMIN_PRIVATE_KEY: {
    required: false, // Conditional
    pattern: /^-----BEGIN PRIVATE KEY-----/,
    description: 'Firebase Admin SDK private key'
  },
  
  REDIS_URL: {
    required: false,
    pattern: /^redis(s)?:\/\/.+/,
    description: 'Redis connection URL'
  },
  
  TWILIO_ACCOUNT_SID: {
    required: false,
    pattern: /^AC[a-f0-9]{32}$/,
    description: 'Twilio Account SID'
  },
  
  CLOUDINARY_CLOUD_NAME: {
    required: false,
    pattern: /^[a-z0-9_-]+$/,
    description: 'Cloudinary cloud name'
  }
};

// Check if a feature is enabled based on environment variables
function isFeatureEnabled(feature) {
  const requiredVars = REQUIRED_ENV_VARS.CONDITIONAL[feature];
  if (!requiredVars) return false;
  
  return requiredVars.some(varName => !!process.env[varName]);
}

// Validate a single environment variable
function validateEnvVar(varName, value, rules) {
  const errors = [];
  
  // Required check
  if (rules.required && (!value || value.trim() === '')) {
    errors.push(`${varName} is required: ${rules.description || 'No description'}`);
    return errors; // Return early if required but missing
  }
  
  // Skip further validation if not provided and not required
  if (!value) return errors;
  
  // Length validation
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`${varName} must be at least ${rules.minLength} characters long`);
  }
  
  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`${varName} must not exceed ${rules.maxLength} characters`);
  }
  
  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(`${varName} format is invalid: ${rules.description || 'Pattern mismatch'}`);
  }
  
  // Enum validation
  if (rules.values && !rules.values.includes(value)) {
    errors.push(`${varName} must be one of: ${rules.values.join(', ')}`);
  }
  
  return errors;
}

// Main validation function
function validateEnvironmentVariables(options = {}) {
  const {
    strict = false,
    features = [],
    stage = process.env.NODE_ENV || 'development'
  } = options;
  
  const errors = [];
  const warnings = [];
  const checkedVars = new Set();
  
  console.log(`🔍 Validating environment variables for ${stage} stage...`);
  
  // Check essential variables
  for (const varName of REQUIRED_ENV_VARS.ESSENTIAL) {
    checkedVars.add(varName);
    const value = process.env[varName];
    const rules = ENV_VALIDATION_RULES[varName] || { required: true };
    
    const varErrors = validateEnvVar(varName, value, rules);
    errors.push(...varErrors);
  }
  
  // Check production-specific variables
  if (stage === 'production') {
    for (const varName of REQUIRED_ENV_VARS.PRODUCTION) {
      checkedVars.add(varName);
      const value = process.env[varName];
      const rules = ENV_VALIDATION_RULES[varName] || { required: true };
      
      const varErrors = validateEnvVar(varName, value, rules);
      errors.push(...varErrors);
    }
  }
  
  // Check conditional variables based on enabled features
  for (const feature of features) {
    if (REQUIRED_ENV_VARS.CONDITIONAL[feature]) {
      console.log(`📋 Checking ${feature} feature variables...`);
      
      for (const varName of REQUIRED_ENV_VARS.CONDITIONAL[feature]) {
        checkedVars.add(varName);
        const value = process.env[varName];
        const rules = ENV_VALIDATION_RULES[varName] || { required: true };
        
        const varErrors = validateEnvVar(varName, value, rules);
        errors.push(...varErrors);
      }
    } else {
      warnings.push(`Unknown feature specified: ${feature}`);
    }
  }
  
  // Auto-detect enabled features and warn about missing configs
  for (const [feature, requiredVars] of Object.entries(REQUIRED_ENV_VARS.CONDITIONAL)) {
    if (!features.includes(feature) && isFeatureEnabled(feature)) {
      warnings.push(`${feature} feature appears to be partially configured but not explicitly enabled`);
      
      // Check remaining variables for this feature
      for (const varName of requiredVars) {
        if (!checkedVars.has(varName)) {
          checkedVars.add(varName);
          const value = process.env[varName];
          const rules = ENV_VALIDATION_RULES[varName] || { required: false };
          
          const varErrors = validateEnvVar(varName, value, rules);
          if (varErrors.length > 0) {
            warnings.push(`${varName}: ${varErrors.join(', ')}`);
          }
        }
      }
    }
  }
  
  // Check all defined validation rules for unexpected configurations
  for (const [varName, rules] of Object.entries(ENV_VALIDATION_RULES)) {
    if (!checkedVars.has(varName) && process.env[varName]) {
      checkedVars.add(varName);
      const value = process.env[varName];
      const varErrors = validateEnvVar(varName, value, rules);
      
      if (varErrors.length > 0 && !strict) {
        warnings.push(`${varName}: ${varErrors.join(', ')}`);
      } else if (varErrors.length > 0) {
        errors.push(...varErrors);
      }
    }
  }
  
  // Report results
  const report = {
    valid: errors.length === 0,
    errors,
    warnings,
    checkedVariables: Array.from(checkedVars).sort(),
    stage,
    enabledFeatures: Object.keys(REQUIRED_ENV_VARS.CONDITIONAL).filter(isFeatureEnabled)
  };
  
  // Console output
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  • ${error}`));
  } else {
    console.log('✅ Environment validation passed');
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => console.warn(`  • ${warning}`));
  }
  
  console.log(`📊 Checked ${checkedVars.size} environment variables`);
  if (report.enabledFeatures.length > 0) {
    console.log(`🎯 Detected features: ${report.enabledFeatures.join(', ')}`);
  }
  
  return report;
}

// Startup validation - call this in your app initialization
function validateEnvironmentOnStartup(options = {}) {
  const report = validateEnvironmentVariables(options);
  
  if (!report.valid) {
    const message = `Environment validation failed:\n${report.errors.join('\n')}`;
    
    if (process.env.NODE_ENV === 'production') {
      // In production, exit the process
      console.error('🚨 Critical environment configuration errors detected. Exiting...');
      process.exit(1);
    } else {
      // In development, just throw an error
      throw new EnvValidationError(message);
    }
  }
  
  return report;
}

// Helper to get missing required variables
function getMissingRequiredVars(features = []) {
  const missing = [];
  
  // Check essential vars
  for (const varName of REQUIRED_ENV_VARS.ESSENTIAL) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  // Check production vars
  if (process.env.NODE_ENV === 'production') {
    for (const varName of REQUIRED_ENV_VARS.PRODUCTION) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
  }
  
  // Check feature-specific vars
  for (const feature of features) {
    if (REQUIRED_ENV_VARS.CONDITIONAL[feature]) {
      for (const varName of REQUIRED_ENV_VARS.CONDITIONAL[feature]) {
        if (!process.env[varName]) {
          missing.push(varName);
        }
      }
    }
  }
  
  return missing;
}

// Helper to generate .env template
function generateEnvTemplate(features = []) {
  let template = '# Environment Variables Configuration\n\n';
  
  template += '# Essential Variables (Always Required)\n';
  for (const varName of REQUIRED_ENV_VARS.ESSENTIAL) {
    const rules = ENV_VALIDATION_RULES[varName];
    template += `${varName}=${varName === 'NODE_ENV' ? 'development' : ''}\n`;
    if (rules?.description) {
      template += `# ${rules.description}\n\n`;
    }
  }
  
  template += '# Production Variables\n';
  for (const varName of REQUIRED_ENV_VARS.PRODUCTION) {
    const rules = ENV_VALIDATION_RULES[varName];
    template += `${varName}=\n`;
    if (rules?.description) {
      template += `# ${rules.description}\n\n`;
    }
  }
  
  for (const feature of features) {
    if (REQUIRED_ENV_VARS.CONDITIONAL[feature]) {
      template += `\n# ${feature.toUpperCase()} Feature Variables\n`;
      for (const varName of REQUIRED_ENV_VARS.CONDITIONAL[feature]) {
        const rules = ENV_VALIDATION_RULES[varName];
        template += `${varName}=\n`;
        if (rules?.description) {
          template += `# ${rules.description}\n\n`;
        }
      }
    }
  }
  
  return template;
}

module.exports = {
  validateEnvironmentVariables,
  validateEnvironmentOnStartup,
  getMissingRequiredVars,
  generateEnvTemplate,
  isFeatureEnabled,
  EnvValidationError,
  REQUIRED_ENV_VARS,
  ENV_VALIDATION_RULES
};

// Default export for ES6 imports
module.exports.default = module.exports;