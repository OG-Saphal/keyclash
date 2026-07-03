import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn instead of throwing so the app still renders (auth features disabled).
  // Copy .env.example → .env.local and fill in your Supabase project credentials.
  console.warn(
    '[KeyClash] Supabase env vars missing. Auth features will be disabled until you add ' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local'
  );
}

// We don't pass the Database generic here — hand-written generics must exactly
// match Supabase's internal shape or every table resolves to `never`.
// Instead, each service casts query results to its own explicit types.
export const supabase = createClient(
  supabaseUrl ,
  supabaseAnonKey ,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);