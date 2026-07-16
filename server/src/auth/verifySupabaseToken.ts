import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// Service-role client — server-side only, never sent to the browser.
// We use auth.getUser(token) rather than local JWT-secret verification:
// one extra network hop per connect, but it means a revoked/expired session
// is rejected immediately without the server needing to track Supabase's
// signing-key rotation itself. Simpler to keep correct, given this project's
// disposition against extra infra.
const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface VerifiedIdentity {
  userId: string;
  email: string | null;
}

/**
 * Verifies a Supabase access token (passed by the client in the socket.io
 * handshake `auth` payload) and resolves it to a trusted userId.
 * Returns null if the token is missing/invalid/expired — callers must reject
 * the connection in that case. Never trust socket.id as identity.
 */
export async function verifySupabaseToken(token: string | undefined): Promise<VerifiedIdentity | null> {
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return { userId: data.user.id, email: data.user.email ?? null };
}