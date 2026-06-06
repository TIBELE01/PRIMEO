// Supabase clients — admin (service role) and auth (anon) for user-facing operations
import { createClient } from '@supabase/supabase-js';
import { env } from './env.config';

// Admin client — service role key, used for user management and JWT verification
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Auth client — anon key, used for signInWithPassword and refreshSession
export const supabaseAuth = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
