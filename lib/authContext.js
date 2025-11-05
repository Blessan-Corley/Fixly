// lib/authContext.js - Context storage for OAuth flow
// This helps us track whether user clicked signup vs signin

const authContextStore = new Map();

// Store the auth context (signup vs signin) with a unique key
export function setAuthContext(email, context) {
  const key = email.toLowerCase();
  authContextStore.set(key, {
    context, // 'signup' or 'signin'
    timestamp: Date.now(),
    expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
  });

  // Clean up expired entries
  cleanupExpiredContexts();
}

// Get the auth context for an email
export function getAuthContext(email) {
  const key = email.toLowerCase();
  const stored = authContextStore.get(key);

  if (!stored) {
    return null;
  }

  // Check if expired
  if (Date.now() > stored.expiresAt) {
    authContextStore.delete(key);
    return null;
  }

  return stored.context;
}

// Clear the auth context after use
export function clearAuthContext(email) {
  const key = email.toLowerCase();
  authContextStore.delete(key);
}

// Clean up expired contexts
function cleanupExpiredContexts() {
  const now = Date.now();
  for (const [key, value] of authContextStore.entries()) {
    if (now > value.expiresAt) {
      authContextStore.delete(key);
    }
  }
}

// Clean up every minute
setInterval(cleanupExpiredContexts, 60 * 1000);
