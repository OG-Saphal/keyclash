import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types/auth';


// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a Supabase profile row + auth user info into our app's UserProfile shape.
 * emailVerified is derived from the auth user's email_confirmed_at (set
 * automatically by Supabase when the user clicks the verification link) so
 * no manual DB write is ever needed.
 */
export function rowToProfile(
  row: Record<string, unknown>,
  email: string,
  emailConfirmedAt?: string | null,
): UserProfile {
  const prefs = (row.preferences as Record<string, unknown>) ?? {};
  return {
    id: row.id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    email,
    emailVerified: emailConfirmedAt != null
      ? true
      : (row.email_verified as boolean) ?? false,
    createdAt: row.created_at as string,
    totalTests: (row.total_tests as number) ?? 0,
    totalTimeTyped: (row.total_time_typed as number) ?? 0,
    avgwpm: (row.avg_wpm as number) ?? 0,
    // 🆕 Feature 5 — bio/about-me (nullable text column added in migration)
    bio: (row.bio as string | null) ?? null,
    preferences: {
      defaultMode: (prefs.defaultMode as 'time' | 'words') ?? 'time',
      defaultDuration: (prefs.defaultDuration as 15 | 30 | 60 | 120) ?? 30,
      defaultWordCount: (prefs.defaultWordCount as 10 | 25 | 50 | 100) ?? 25,
      defaultWordSet: (prefs.defaultWordSet as 'english200' | 'english1k' | 'common') ?? 'english200',
      theme: (prefs.theme as 'dark' | 'light') ?? 'dark',
    },
  };
}

// ─── Auth Operations ──────────────────────────────────────────────────────────

export async function authLogin(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  // Update last_login_at — cast to any to bypass strict never typing
  await (supabase.from('profiles') as any)
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id);

  const { data: profile, error: profileError } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) throw new Error('Could not fetch user profile.');
  return rowToProfile(
    profile as Record<string, unknown>,
    data.user.email ?? '',
    data.user.email_confirmed_at,
  );
}

export async function authSignUp(
  email: string,
  password: string,
  username: string,
  displayName: string,
): Promise<void> {
  const redirectUrl =
    import.meta.env.VITE_VERIFICATION_REDIRECT_URL ?? `${window.location.origin}/verify`;

  // Pass username & display_name in raw_user_meta_data so the DB trigger
  // (handle_new_user) can insert the profiles row using the service role,
  // bypassing RLS. We must NOT insert from the client here because the session
  // is not established until after email verification, so auth.uid() is null
  // and the RLS INSERT policy rejects it with a 401.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: { username, display_name: displayName },
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Sign-up succeeded but no user was returned.');
  // Profile row is created by the handle_new_user trigger — nothing else needed.
}

export async function authLogout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function authResetPassword(email: string): Promise<void> {
  const redirectUrl =
    import.meta.env.VITE_RESET_PASSWORD_REDIRECT_URL ?? `${window.location.origin}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  if (error) throw new Error(error.message);
}

export async function authResendVerification(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) throw new Error('No authenticated user found.');

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: data.user.email,
    options: {
      emailRedirectTo:
        import.meta.env.VITE_VERIFICATION_REDIRECT_URL ?? `${window.location.origin}/verify`,
    },
  });
  if (error) throw new Error(error.message);
}

export async function fetchCurrentProfile(): Promise<UserProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  const user = sessionData.session.user;

  const { data: profile, error } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) return null;
  return rowToProfile(
    profile as Record<string, unknown>,
    user.email ?? '',
    user.email_confirmed_at,
  );
}
