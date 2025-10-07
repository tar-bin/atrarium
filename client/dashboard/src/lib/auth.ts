/**
 * Authentication utilities for route guards
 */

const SESSION_STORAGE_KEY = 'pds_session';

interface StoredSession {
  did: string;
  handle: string;
}

/**
 * Check if user has a stored session (logged in previously)
 */
export function isAuthenticated(): boolean {
  const storedSessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!storedSessionStr) {
    return false;
  }

  try {
    const storedSession: StoredSession = JSON.parse(storedSessionStr);
    return !!(storedSession.did && storedSession.handle);
  } catch {
    return false;
  }
}

/**
 * Get stored session data
 */
export function getStoredSession(): StoredSession | null {
  const storedSessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!storedSessionStr) {
    return null;
  }

  try {
    return JSON.parse(storedSessionStr);
  } catch {
    return null;
  }
}
