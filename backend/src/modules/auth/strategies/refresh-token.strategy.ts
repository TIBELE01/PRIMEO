// Refresh token strategy — delegates to Supabase session management
// Supabase handles token rotation internally via auth.refreshSession()
export function extractRefreshPayload(_token: string): null {
  return null;
}
