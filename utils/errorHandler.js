// utils/errorHandler.js - Comprehensive error handling utility
import { toast } from 'sonner';

export class ErrorHandler {
  static instance = null;
  
  constructor() {
    if (ErrorHandler.instance) {
      return ErrorHandler.instance;
    }
    
    this.errorLog = [];
    this.maxLogSize = 100;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    
    ErrorHandler.instance = this;
  }
  
  // Enhanced error categorization
  static categorizeError(error) {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { category: 'network', severity: 'high', userMessage: 'Network connection problem' };
    }
    
    // Authentication errors
    if (error.status === 401 || error.message?.includes('Authentication')) {
      return { category: 'auth', severity: 'critical', userMessage: 'Please log in again' };
    }
    
    // Authorization errors
    if (error.status === 403 || error.message?.includes('Forbidden')) {
      return { category: 'permission', severity: 'high', userMessage: 'You don\'t have permission for this action' };
    }
    
    // Rate limiting
    if (error.status === 429) {
      return { category: 'rate_limit', severity: 'medium', userMessage: 'Too many requests. Please wait a moment.' };
    }
    
    // Server errors
    if (error.status >= 500) {
      return { category: 'server', severity: 'high', userMessage: 'Server error. Please try again later.' };
    }
    
    // Client errors
    if (error.status >= 400 && error.status < 500) {
      return { category: 'client', severity: 'medium', userMessage: 'Invalid request' };
    }
    
    // Database errors
    if (error.name === 'MongoError' || error.message?.includes('database')) {
      return { category: 'database', severity: 'critical', userMessage: 'Database connection problem' };
    }
    
    // Validation errors
    if (error.name === 'ValidationError') {
      return { category: 'validation', severity: 'low', userMessage: 'Please check your input' };
    }
    
    // Location errors
    if (error.code === 1) { // PERMISSION_DENIED
      return { category: 'location', severity: 'medium', userMessage: 'Location access denied' };
    }
    if (error.code === 2) { // POSITION_UNAVAILABLE
      return { category: 'location', severity: 'medium', userMessage: 'Location unavailable' };
    }
    if (error.code === 3) { // TIMEOUT
      return { category: 'location', severity: 'low', userMessage: 'Location request timed out' };
    }
    
    // Payment errors
    if (error.message?.includes('payment') || error.message?.includes('stripe')) {
      return { category: 'payment', severity: 'high', userMessage: 'Payment processing error' };
    }
    
    // File upload errors
    if (error.message?.includes('upload') || error.message?.includes('file')) {
      return { category: 'upload', severity: 'medium', userMessage: 'File upload failed' };
    }
    
    // Default unknown error
    return { category: 'unknown', severity: 'medium', userMessage: 'Something went wrong' };
  }
  
  // Enhanced error handling with context
  static handle(error, context = {}) {
    const errorData = this.categorizeError(error);
    const timestamp = new Date().toISOString();
    
    const errorInfo = {
      ...errorData,
      originalError: error,
      context,
      timestamp,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userId: context.userId || null
    };
    
    // Log error
    this.logError(errorInfo);
    
    // Handle based on severity and category
    this.processError(errorInfo);
    
    return errorInfo;
  }
  
  static logError(errorInfo) {
    if (!this.instance) {
      new ErrorHandler();
    }
    
    // Add to in-memory log
    this.instance.errorLog.push(errorInfo);
    if (this.instance.errorLog.length > this.instance.maxLogSize) {
      this.instance.errorLog.shift();
    }
    
    // Console log with formatting
    console.group(`🚨 ${errorInfo.category.toUpperCase()} Error - ${errorInfo.severity.toUpperCase()}`);
    console.error('Message:', errorInfo.userMessage);
    console.error('Original Error:', errorInfo.originalError);
    console.error('Context:', errorInfo.context);
    console.error('Timestamp:', errorInfo.timestamp);
    console.groupEnd();
    
    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(errorInfo);
    }
  }
  
  static processError(errorInfo) {
    const { category, severity, userMessage, context } = errorInfo;
    
    // Critical errors - immediate action required
    if (severity === 'critical') {
      if (category === 'auth') {
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin';
        }
        return;
      }
      
      if (category === 'database') {
        toast.error('System maintenance in progress. Please try again in a few minutes.');
        return;
      }
    }
    
    // High severity errors - show prominent notification
    if (severity === 'high') {
      toast.error(userMessage, {
        duration: 5000,
        action: context.retryAction ? {
          label: 'Retry',
          onClick: context.retryAction
        } : undefined
      });
      return;
    }
    
    // Medium severity errors - standard notification
    if (severity === 'medium') {
      toast.warning(userMessage, { duration: 4000 });
      return;
    }
    
    // Low severity errors - subtle notification
    if (severity === 'low') {
      toast.info(userMessage, { duration: 3000 });
      return;
    }
    
    // Default handling
    toast.error(userMessage);
  }
  
  // Retry mechanism with exponential backoff
  static async retry(operation, context = {}) {
    const key = context.operationId || operation.name || 'unknown';
    const attempts = this.instance?.retryAttempts.get(key) || 0;
    
    if (attempts >= this.maxRetries) {
      throw new Error(`Max retry attempts (${this.maxRetries}) exceeded for ${key}`);
    }
    
    try {
      const result = await operation();
      // Reset attempts on success
      this.instance?.retryAttempts.delete(key);
      return result;
    } catch (error) {
      const newAttempts = attempts + 1;
      this.instance?.retryAttempts.set(key, newAttempts);
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempts) * 1000;
      
      if (newAttempts < this.maxRetries) {
        console.log(`Retrying ${key} in ${delay}ms (attempt ${newAttempts}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retry(operation, context);
      }
      
      throw error;
    }
  }
  
  // Async operation wrapper with comprehensive error handling
  static async safeExecute(operation, options = {}) {
    const {
      context = {},
      showLoading = false,
      showSuccess = false,
      successMessage = 'Operation completed successfully',
      fallbackValue = null,
      retries = false
    } = options;
    
    try {
      let result;
      
      if (retries) {
        result = await this.retry(operation, context);
      } else {
        result = await operation();
      }
      
      if (showSuccess) {
        toast.success(successMessage);
      }
      
      return result;
    } catch (error) {
      this.handle(error, context);
      return fallbackValue;
    }
  }
  
  // Form validation error handling
  static handleValidationErrors(errors, formRef = null) {
    if (!errors || typeof errors !== 'object') return;
    
    Object.entries(errors).forEach(([field, message]) => {
      // Show toast for each validation error
      toast.error(`${field}: ${message}`, { duration: 4000 });
      
      // Focus first error field if form ref provided
      if (formRef && formRef.current) {
        const errorField = formRef.current.querySelector(`[name="${field}"]`);
        if (errorField && !document.activeElement) {
          errorField.focus();
        }
      }
    });
  }
  
  // API response error handler
  static async handleApiResponse(response, context = {}) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || 'API request failed');
      error.status = response.status;
      error.data = errorData;
      
      throw error;
    }
    
    return response.json();
  }
  
  // Send errors to external logging service
  static async sendToLoggingService(errorInfo) {
    try {
      // Only send critical and high severity errors to avoid spam
      if (!['critical', 'high'].includes(errorInfo.severity)) return;
      
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...errorInfo,
          // Remove sensitive data
          originalError: {
            name: errorInfo.originalError.name,
            message: errorInfo.originalError.message,
            stack: errorInfo.originalError.stack
          }
        })
      });
    } catch (logError) {
      console.error('Failed to send error to logging service:', logError);
    }
  }
  
  // Get recent errors for debugging
  static getRecentErrors(count = 10) {
    return this.instance?.errorLog.slice(-count) || [];
  }
  
  // Clear error log
  static clearErrorLog() {
    if (this.instance) {
      this.instance.errorLog = [];
      this.instance.retryAttempts.clear();
    }
  }
}

// Convenience functions
export const handleError = (error, context) => ErrorHandler.handle(error, context);
export const safeExecute = (operation, options) => ErrorHandler.safeExecute(operation, options);
export const handleValidationErrors = (errors, formRef) => ErrorHandler.handleValidationErrors(errors, formRef);
export const handleApiResponse = (response, context) => ErrorHandler.handleApiResponse(response, context);

// Global error boundaries for React
export const withErrorHandling = (Component) => {
  return function ErrorBoundaryWrapper(props) {
    const handleError = (error, errorInfo) => {
      ErrorHandler.handle(error, {
        component: Component.name,
        errorInfo,
        props: JSON.stringify(props, null, 2)
      });
    };
    
    return (
      <ErrorBoundary onError={handleError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// React Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">We're sorry, but something unexpected happened.</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorHandler;