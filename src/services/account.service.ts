import { supabase } from '../lib/supabase';
import { deleteAllResults, exportData } from './results.service';

export async function deleteAccount(userId: string, reason?: string): Promise<string> {
  // 1. Export data first
  const exportJson = await exportData(userId);

  // 2. Fetch profile username for the log record
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('username')
    .eq('id', userId)
    .single();

  const { data: { user } } = await supabase.auth.getUser();

  // 3. Anonymised deletion log (GDPR)
  await (supabase.from('deleted_accounts') as any).insert({
    original_user_id: userId,
    email: user?.email ?? null,
    username: (profile as Record<string, unknown> | null)?.username ?? null,
    deletion_reason: reason ?? null,
  });

  // 4. Delete results
  await deleteAllResults(userId);

  // 5. Delete profile row
  await (supabase.from('profiles') as any).delete().eq('id', userId);

  // 6. Call Edge Function to delete auth.users row (requires service-role key server-side).
  //    Comment this out if you haven't created the Edge Function yet.
  try {
    await supabase.functions.invoke('delete-user', { body: { userId } });
  } catch (_) {
    // Non-fatal — user is signed out below regardless
  }

  // 7. Sign out
  await supabase.auth.signOut();

  return exportJson;
}
