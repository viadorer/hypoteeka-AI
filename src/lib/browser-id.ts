/**
 * Browser fingerprint for session ownership without authentication
 * Generates a stable ID based on browser characteristics + localStorage
 */

const STORAGE_KEY = 'hypoteeka_browser_id';

function generateFingerprint(): string {
  // Simple fingerprint based on available browser data
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
  ];
  
  const str = components.join('|');
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Add random component for uniqueness
  const random = Math.random().toString(36).substring(2, 15);
  return `${Math.abs(hash).toString(36)}-${random}`;
}

export function getBrowserId(): string {
  if (typeof window === 'undefined') return 'ssr';
  
  try {
    // Try to get existing ID from localStorage
    let id = localStorage.getItem(STORAGE_KEY);
    
    if (!id) {
      // Generate new ID and store it
      id = generateFingerprint();
      localStorage.setItem(STORAGE_KEY, id);
    }
    
    return id;
  } catch {
    // Fallback if localStorage is not available
    return generateFingerprint();
  }
}

export function clearBrowserId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}
