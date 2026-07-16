// 🆕 Types for the profile page's multiplayer stats section (Feature 4).
// Mirrors the shape returned by the `get_multiplayer_stats` RPC and the
// multiplayer_races / multiplayer_race_participants tables (see the
// migration SQL). These races are written server-side only — see
// server/src/db/raceResults.ts — never by the client.

export interface MultiplayerStatsSummary {
  totalRaces: number;
  wins: number;
  losses: number;
  draws: number;
  avgWpm: number;
  bestWpm: number;
}

export type MultiplayerRaceResult = 'win' | 'loss' | 'draw';

export interface MultiplayerOpponentSummary {
  userId: string;
  username: string;
  wpm: number;
  rank: number;
}

export interface MultiplayerRecentResult {
  raceId: string;
  createdAt: string;
  mode: 'time' | 'words';
  duration: number | null;
  wordCount: number | null;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  rank: number;
  result: MultiplayerRaceResult;
  dnf: boolean;
  /** Every other participant in that race, sorted by rank. */
  opponents: MultiplayerOpponentSummary[];
}
