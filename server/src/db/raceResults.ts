import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import type { RoomState, RoomPlayer } from '../rooms/types.js';

// 🆕 Feature 4 — multiplayer stats persistence. Called ONLY from
// socket/handlers.ts's 'race:finish' handler, and only once rooms.finishRace()
// confirms every active player has a finalStats entry (i.e. the race is
// truly over) — never from the client, per the project's "never trust the
// client" convention already used for room codes / colors / race text /
// final stats. This module only ever runs with the server's own
// already-recomputed finalStats as input.
//
// Design note: races can have 2-10 players, not just 1v1, so results are
// stored as one row per participant in multiplayer_race_participants (with a
// rank + win/loss/draw outcome) rather than a single opponent_id column —
// see the migration SQL for the two-table shape and rationale.

interface ParticipantForSave {
  userId: string;
  username: string;
  rank: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  result: 'win' | 'loss' | 'draw';
  dnf: boolean;
  outlierFlag: boolean;
}

/**
 * Ranks + assigns win/loss/draw for every non-spectator player in a finished
 * room. Mirrors the client's own leaderboard sort in
 * MultiplayerResultsPage.tsx (dnf sorts last, otherwise wpm descending) so
 * the stored rank always matches what players actually saw on screen.
 */
function computeParticipants(room: RoomState): ParticipantForSave[] {
  const active = [...room.players.values()].filter((p) => !p.isSpectator);

  const sorted = [...active].sort((a, b) => {
    const aDnf = a.finalStats?.dnf ?? true;
    const bDnf = b.finalStats?.dnf ?? true;
    if (aDnf && !bDnf) return 1;
    if (!aDnf && bDnf) return -1;
    return (b.finalStats?.wpm ?? 0) - (a.finalStats?.wpm ?? 0);
  });

  const finishers = sorted.filter((p) => !(p.finalStats?.dnf ?? true));
  const maxWpm = finishers.length > 0 ? Math.max(...finishers.map((p) => p.finalStats!.wpm)) : 0;
  const winnersCount = finishers.filter((p) => p.finalStats!.wpm === maxWpm).length;

  return sorted.map((p: RoomPlayer, i: number) => {
    const stats = p.finalStats;
    const dnf = stats?.dnf ?? true;

    let result: 'win' | 'loss' | 'draw' = 'loss';
    if (!dnf && stats) {
      if (stats.wpm === maxWpm) {
        result = winnersCount > 1 ? 'draw' : 'win';
      } else {
        result = 'loss';
      }
    }

    return {
      userId: p.userId,
      username: p.username,
      rank: i + 1,
      wpm: stats?.wpm ?? 0,
      rawWpm: stats?.rawWpm ?? 0,
      accuracy: stats?.accuracy ?? 0,
      result,
      dnf,
      outlierFlag: stats?.outlierFlag ?? false,
    };
  });
}

/**
 * Persists a finished race + its participants. Fire-and-forget from the
 * caller's perspective — failures are logged, never thrown, so a Supabase
 * hiccup can't block or delay the 'race:results' broadcast that already
 * went out to players before this is called.
 */
export async function saveRaceResults(room: RoomState): Promise<void> {
  try {
    const participants = computeParticipants(room);
    if (participants.length === 0) return;

    const { data: raceRow, error: raceError } = await supabaseAdmin
      .from('multiplayer_races')
      .insert({
        room_code: room.id,
        mode: room.settings.mode,
        duration: room.settings.mode === 'time' ? room.settings.duration : null,
        word_count: room.settings.mode === 'words' ? room.settings.wordCount : null,
        word_set: room.settings.wordSet,
        player_count: participants.length,
        finished_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (raceError || !raceRow) {
      console.error('[raceResults] failed to insert multiplayer_races row:', raceError);
      return;
    }

    const rows = participants.map((p) => ({
      race_id: raceRow.id,
      user_id: p.userId,
      username: p.username,
      rank: p.rank,
      wpm: p.wpm,
      raw_wpm: p.rawWpm,
      accuracy: p.accuracy,
      result: p.result,
      dnf: p.dnf,
      outlier_flag: p.outlierFlag,
    }));

    const { error: participantsError } = await supabaseAdmin
      .from('multiplayer_race_participants')
      .insert(rows);

    if (participantsError) {
      console.error('[raceResults] failed to insert multiplayer_race_participants rows:', participantsError);
    }
  } catch (e) {
    console.error('[raceResults] unexpected error saving race results:', e);
  }
}
