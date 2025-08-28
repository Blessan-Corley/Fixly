'use client';

export class LocationErrorHandler {
  constructor() {
    this.errorCodes = {
      // Geolocation API errors
      PERMISSION_DENIED: 'PERMISSION_DENIED',
      POSITION_UNAVAILABLE: 'POSITION_UNAVAILABLE',
      TIMEOUT: 'TIMEOUT',
      
      // Network/API errors
      NETWORK_ERROR: 'NETWORK_ERROR',
      GEOCODING_FAILED: 'GEOCODING_FAILED',
      REVERSE_GEOCODING_FAILED: 'REVERSE_GEOCODING_FAILED',
      
      // Service errors
      SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
      INVALID_RESPONSE: 'INVALID_RESPONSE',
      RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
      
      // Data errors
      INVALID_COORDINATES: 'INVALID_COORDINATES',
      NO_LOCATION_DATA: 'NO_LOCATION_DATA',
      CACHE_ERROR: 'CACHE_ERROR',
      
      // User errors
      CANCELLED_BY_USER: 'CANCELLED_BY_USER',
      NO_FALLBACK_AVAILABLE: 'NO_FALLBACK_AVAILABLE'
    };

    this.userMessages = {
      [this.errorCodes.PERMISSION_DENIED]: {
        title: 'Location Access Denied',
        message: "We'll use your signup location instead. You can change location permissions in your browser settings.",
        type: 'warning',
        showSignupFallback: true,
        recoverable: true
      },
      [this.errorCodes.POSITION_UNAVAILABLE]: {
        title: 'Location Not Available',
        message: 'Your device cannot determine its location right now. Using your saved location instead.',
        type: 'warning',
        showSignupFallback: true,
        recoverable: true
      },
      [this.errorCodes.TIMEOUT]: {
        title: 'Location Timeout',
        message: 'Location detection is taking too long. We\'ll use your registered city.',
        type: 'warning',
        showSignupFallback: true,
        recoverable: true
      },
      [this.errorCodes.NETWORK_ERROR]: {
        title: 'Connection Issue',
        message: 'Unable to connect to location services. Please check your internet connection.',
        type: 'error',
        showRetry: true,
        recoverable: true
      },
      [this.errorCodes.GEOCODING_FAILED]: {
        title: 'Address Not Found',
        message: 'We couldn\'t find that address. Please try a different location or city name.',
        type: 'error',
        showManualInput: true,
        recoverable: true
      },
      [this.errorCodes.REVERSE_GEOCODING_FAILED]: {
        title: 'Location Processing Error',
        message: 'We found your coordinates but couldn\'t determine the address. The location will still work for nearby jobs.',
        type: 'warning',
        recoverable: true
      },
      [this.errorCodes.SERVICE_UNAVAILABLE]: {
        title: 'Service Temporarily Down',
        message: 'Location services are temporarily unavailable. Please try again in a few minutes.',
        type: 'error',
        showRetry: true,
        recoverable: true
      },
      [this.errorCodes.INVALID_RESPONSE]: {
        title: 'Invalid Location Data',
        message: 'Received invalid location information. Please try a different method.',
        type: 'error',
        showAlternativeMethods: true,
        recoverable: true
      },
      [this.errorCodes.RATE_LIMIT_EXCEEDED]: {
        title: 'Too Many Requests',
        message: 'Location service is temporarily limited. Please wait a moment and try again.',
        type: 'warning',
        showRetry: true,
        delayRetry: 30000,
        recoverable: true
      },
      [this.errorCodes.INVALID_COORDINATES]: {
        title: 'Invalid Location',
        message: 'The provided coordinates are not valid. Please enter a different location.',
        type: 'error',
        showManualInput: true,
        recoverable: true
      },
      [this.errorCodes.NO_LOCATION_DATA]: {
        title: 'No Location Available',
        message: 'No location data is available. Please set your location manually.',
        type: 'error',
        showManualInput: true,
        recoverable: true
      },
      [this.errorCodes.CACHE_ERROR]: {
        title: 'Storage Issue',
        message: 'Unable to save location preferences. Your selection will work for this session.',
        type: 'warning',
        recoverable: false
      },
      [this.errorCodes.CANCELLED_BY_USER]: {
        title: 'Location Not Set',
        message: 'Location selection was cancelled. You can set it later in your profile.',
        type: 'info',
        recoverable: true
      },
      [this.errorCodes.NO_FALLBACK_AVAILABLE]: {
        title: 'No Backup Location',
        message: 'No saved location is available. Please enter your location manually to continue.',
        type: 'error',
        showManualInput: true,
        recoverable: true
      }
    };
  }

  // Process raw error into standardized format
  processError(error, context = {}) {
    const processedError = {
      code: null,
      originalError: error,
      context,
      timestamp: new Date(),
      recoverable: true,
      fallbackOptions: []
    };

    // Determine error code from different sources
    if (error instanceof GeolocationPositionError) {
      processedError.code = this.mapGeolocationError(error.code);
    } else if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      processedError.code = this.errorCodes.NETWORK_ERROR;
    } else if (error.message?.includes('geocod')) {
      processedError.code = this.errorCodes.GEOCODING_FAILED;
    } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      processedError.code = this.errorCodes.TIMEOUT;
    } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      processedError.code = this.errorCodes.RATE_LIMIT_EXCEEDED;
    } else if (error.message?.includes('coordinates') || error.message?.includes('invalid')) {
      processedError.code = this.errorCodes.INVALID_COORDINATES;
    } else if (error.message?.includes('cancelled') || error.message?.includes('abort')) {
      processedError.code = this.errorCodes.CANCELLED_BY_USER;
    } else if (error.message?.includes('service unavailable') || error.message?.includes('503')) {
      processedError.code = this.errorCodes.SERVICE_UNAVAILABLE;
    } else {
      // Generic error
      processedError.code = this.errorCodes.SERVICE_UNAVAILABLE;
    }

    // Add user-friendly information
    const userInfo = this.userMessages[processedError.code] || this.userMessages[this.errorCodes.SERVICE_UNAVAILABLE];
    processedError.userMessage = userInfo;

    // Determine fallback options based on error type and context
    processedError.fallbackOptions = this.determineFallbackOptions(processedError.code, context);

    return processedError;
  }

  // Map GeolocationPositionError codes
  mapGeolocationError(code) {
    switch (code) {
      case 1: return this.errorCodes.PERMISSION_DENIED;
      case 2: return this.errorCodes.POSITION_UNAVAILABLE;
      case 3: return this.errorCodes.TIMEOUT;
      default: return this.errorCodes.POSITION_UNAVAILABLE;
    }
  }

  // Determine appropriate fallback options
  determineFallbackOptions(errorCode, context) {
    const options = [];

    switch (errorCode) {
      case this.errorCodes.PERMISSION_DENIED:
        options.push('signup_form', 'ip_location', 'manual');
        break;
      
      case this.errorCodes.POSITION_UNAVAILABLE:
      case this.errorCodes.TIMEOUT:
        options.push('signup_form', 'ip_location', 'manual');
        break;
      
      case this.errorCodes.NETWORK_ERROR:
        options.push('cached', 'signup_form', 'manual');
        break;
      
      case this.errorCodes.GEOCODING_FAILED:
        options.push('ip_location', 'signup_form', 'manual');
        break;
      
      case this.errorCodes.SERVICE_UNAVAILABLE:
        options.push('cached', 'signup_form', 'ip_location', 'manual');
        break;
      
      default:
        options.push('signup_form', 'manual');
    }

    return options;
  }

  // Create user-friendly error message with recovery options
  createUserErrorMessage(processedError) {
    const { userMessage, fallbackOptions } = processedError;
    
    return {
      title: userMessage.title,
      message: userMessage.message,
      type: userMessage.type,
      recoverable: userMessage.recoverable,
      actions: this.generateRecoveryActions(userMessage, fallbackOptions),
      timestamp: processedError.timestamp
    };
  }

  // Generate recovery actions based on error type
  generateRecoveryActions(userMessage, fallbackOptions) {
    const actions = [];

    if (userMessage.showRetry) {
      actions.push({
        type: 'retry',
        label: 'Try Again',
        primary: true,
        delay: userMessage.delayRetry || 0
      });
    }

    if (userMessage.showSignupFallback && fallbackOptions.includes('signup_form')) {
      actions.push({
        type: 'use_signup',
        label: 'Use Registration Location',
        primary: false
      });
    }

    if (userMessage.showManualInput) {
      actions.push({
        type: 'manual_input',
        label: 'Enter Manually',
        primary: !userMessage.showRetry
      });
    }

    if (userMessage.showAlternativeMethods) {
      actions.push({
        type: 'alternative_methods',
        label: 'Other Options',
        primary: false
      });
    }

    // Always provide a way to use IP location if available
    if (fallbackOptions.includes('ip_location')) {
      actions.push({
        type: 'ip_location',
        label: 'Auto-detect Location',
        primary: false
      });
    }

    return actions;
  }

  // Log error for debugging/analytics
  logError(processedError, userId = null) {
    const logData = {
      errorCode: processedError.code,
      originalMessage: processedError.originalError?.message,
      context: processedError.context,
      timestamp: processedError.timestamp,
      userId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Location Error:', logData);
    }

    // Could send to analytics service in production
    this.sendToAnalytics(logData);
  }

  // Send error data to analytics (stub for now)
  sendToAnalytics(logData) {
    // In production, this could send to your analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'location_error', {
        error_code: logData.errorCode,
        error_context: logData.context?.context || 'unknown'
      });
    }
  }

  // Check if error is recoverable
  isRecoverable(processedError) {
    return processedError.recoverable && processedError.fallbackOptions.length > 0;
  }

  // Get retry delay for rate-limited errors
  getRetryDelay(processedError) {
    if (processedError.code === this.errorCodes.RATE_LIMIT_EXCEEDED) {
      return processedError.userMessage.delayRetry || 30000;
    }
    return 0;
  }

  // Get appropriate icon for error type
  getErrorIcon(errorType) {
    const icons = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };
    
    return icons[errorType] || icons.error;
  }
}

// Singleton instance
let locationErrorHandler = null;

export const getLocationErrorHandler = () => {
  if (!locationErrorHandler) {
    locationErrorHandler = new LocationErrorHandler();
  }
  return locationErrorHandler;
};

export default LocationErrorHandler;