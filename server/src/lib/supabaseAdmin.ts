import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// 🆕 Extracted from auth/verifySupabaseToken.ts so both the auth-verification
// path and the new race-results persistence path (db/raceResults.ts) share
// a single service-role client instance instead of each creating their own.
// Service-role key — server-side only, NEVER sent to the browser.
export const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
