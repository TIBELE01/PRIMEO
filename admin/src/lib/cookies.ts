// Cookie / storage key constants for admin dashboard
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'primeo_admin_token',
  ADMIN_USER:   'primeo_admin_user',
  SESSION_EXPIRY: 'primeo_session_expiry',
  LAST_ACTIVITY: 'primeo_last_activity',
} as const;

export const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

// Update last activity timestamp in session storage
export function updateLastActivity(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
  }
}

// Check if session has expired due to inactivity
export function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return false;
  const last = sessionStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
  if (!last) return false;
  return Date.now() - Number(last) > SESSION_TIMEOUT_MS;
}
