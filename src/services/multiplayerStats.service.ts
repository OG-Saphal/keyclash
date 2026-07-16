// 🆕 Feature 4 — multiplayer stats section. Reads from the multiplayer_races /
// multiplayer_race_participants tables, which are written EXCLUSIVELY by the
// Node server's service-role client (see server/src/db/raceResults.ts) right
// after it recomputes authoritative final stats — never by this client.
// This file is read-only by design; there is no "save multiplayer result"
// export here on purpose.
import { supabase } from '../lib/supabase';
import type {
  MultiplayerStatsSummary,
  MultiplayerRecentResult,
  MultiplayerOpponentSummary,
} from '../types/multiplayerStats';
import type { MultiplayerRaceParticipantRow, MultiplayerRaceRow } from '../types/database';

// ─── Summary card stats ────────────────────────────────────────────────────────

export async function fetchMultiplayerStats(userId: string): Promise<MultiplayerStatsSummary | null> {
  const { data, error } = await (supabase.rpc as any)('get_multiplayer_stats', { p_user_id: userId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.total_races === 0) return null;

  return {
    totalRaces: row.total_races ?? 0,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    draws: row.draws ?? 0,
    avgWpm: Number(row.avg_wpm ?? 0),
    bestWpm: Number(row.best_wpm ?? 0),
  };
}

// ─── Recent multiplayer results (with opponents) ───────────────────────────────

export async function fetchRecentMultiplayerResults(
  userId: string,
  limit = 10,
): Promise<MultiplayerRecentResult[]> {
  // 1) This user's own participant rows, most recent first, joined to the race row.
  const { data: mine, error: mineError } = await (supabase
    .from('multiplayer_race_participants') as any)
    .select('*, multiplayer_races(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (mineError) throw new Error(mineError.message);
  const myRows = (mine ?? []) as Array<MultiplayerRaceParticipantRow & { multiplayer_races: MultiplayerRaceRow }>;
  if (myRows.length === 0) return [];

  // 2) Batch-fetch every OTHER participant across all those races in one
  // query (avoids an N+1 — one extra round trip total, not one per race).
  const raceIds = myRows.map(r => r.race_id);
  const { data: others, error: othersError } = await (supabase
    .from('multiplayer_race_participants') as any)
    .select('race_id, user_id, username, wpm, rank')
    .in('race_id', raceIds)
    .neq('user_id', userId);

  if (othersError) throw new Error(othersError.message);
  const othersByRace = new Map<string, MultiplayerOpponentSummary[]>();
  for (const row of (others ?? []) as Array<{ race_id: string; user_id: string; username: string; wpm: number; rank: number }>) {
    const list = othersByRace.get(row.race_id) ?? [];
    list.push({ userId: row.user_id, username: row.username, wpm: Number(row.wpm), rank: row.rank });
    othersByRace.set(row.race_id, list);
  }

  return myRows.map(r => ({
    raceId: r.race_id,
    createdAt: r.created_at,
    mode: r.multiplayer_races.mode,
    duration: r.multiplayer_races.duration,
    wordCount: r.multiplayer_races.word_count,
    wpm: Number(r.wpm),
    rawWpm: Number(r.raw_wpm),
    accuracy: Number(r.accuracy),
    rank: r.rank,
    result: r.result,
    dnf: r.dnf,
    opponents: (othersByRace.get(r.race_id) ?? []).sort((a, b) => a.rank - b.rank),
  }));
}
