import { supabase } from '../lib/supabase';
import type { StoredResult, HistoryFilters } from '../types/auth';
import type { TestResult } from '../types';

// ─── Save a result ────────────────────────────────────────────────────────────

export async function saveResult(userId: string, result: TestResult): Promise<StoredResult> {
  const insert = {
    user_id: userId,
    mode: result.mode,
    duration: result.duration,
    word_count: result.wordCount,
    word_set: result.wordSet,
    wpm: result.wpm,
    raw_wpm: result.rawWpm,
    accuracy: result.accuracy,
    characters_typed: result.totalChars,
    words_typed: result.wordsTyped,
    correct_chars: result.correctChars,
    incorrect_chars: result.incorrectChars,
    keystrokes: 0,
    time_elapsed: result.mode === 'time' ? result.duration : 0,
  };

  const { data, error } = await (supabase.from('typing_results') as any)
    .insert(insert)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as StoredResult;
}

// ─── Fetch history ────────────────────────────────────────────────────────────

export async function fetchHistory(
  userId: string,
  page = 1,
  limit = 20,
  filters?: HistoryFilters,
): Promise<{ results: StoredResult[]; total: number }> {
  let query = (supabase.from('typing_results') as any)
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (filters?.mode) query = query.eq('mode', filters.mode);
  if (filters?.wordSet) query = query.eq('word_set', filters.wordSet);
  if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { results: (data ?? []) as StoredResult[], total: count ?? 0 };
}

// ─── Aggregate stats ──────────────────────────────────────────────────────────

export async function fetchUserStats(userId: string) {
  const { data, error } = await (supabase.from('typing_results') as any)
    .select('wpm, raw_wpm, accuracy, created_at, mode')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  if (!data || (data as any[]).length === 0) return null;

  const rows = data as Array<{ wpm: number; raw_wpm: number; accuracy: number; created_at: string; mode: string }>;
  const wpms = rows.map(r => Number(r.wpm));
  const accs = rows.map(r => Number(r.accuracy));

  return {
    totalTests: rows.length,
    avgWpm: avg(wpms),
    bestWpm: Math.max(...wpms),
    avgAccuracy: avg(accs),
    recentTests: rows.slice(0, 10),
  };
}

function avg(arr: number[]) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ─── Export data as JSON string ───────────────────────────────────────────────

export async function exportData(userId: string): Promise<string> {
  const [profileRes, resultsRes] = await Promise.all([
    (supabase.from('profiles') as any).select('*').eq('id', userId).single(),
    (supabase.from('typing_results') as any).select('*').eq('user_id', userId),
  ]);

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      profile: profileRes.data,
      results: resultsRes.data,
    },
    null,
    2,
  );
}

// ─── Delete all user results ──────────────────────────────────────────────────

export async function deleteAllResults(userId: string): Promise<void> {
  const { error } = await (supabase.from('typing_results') as any)
    .delete()
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
