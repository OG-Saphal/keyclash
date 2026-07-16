// 🆕 Hand-maintained mirror of the Supabase schema. NOTE: per lib/supabase.ts's
// existing comment, this generic is deliberately NOT passed to createClient()
// — hand-written generics didn't match Supabase's internal shape there.
// This file exists purely as a readable reference / for functions that want
// an explicit row shape to cast to, following the same convention as
// rowToProfile()/rowToSummary() elsewhere in the codebase.

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  email_verified: boolean;
  last_login_at: string | null;
  total_tests: number;
  total_time_typed: number;
  total_keystrokes: number;
  achievements: unknown[];
  preferences: Record<string, unknown>;
  avg_wpm: number;
  /** 🆕 Feature 5 — bio/about-me, max 200 chars. */
  bio: string | null;
}

export interface TypingResultRow {
  id: number;
  user_id: string;
  created_at: string;
  mode: 'time' | 'words';
  duration: number | null;
  word_count: number | null;
  word_set: string;
  wpm: number;
  raw_wpm: number;
  accuracy: number;
  consistency: number | null;
  characters_typed: number;
  words_typed: number;
  correct_chars: number;
  incorrect_chars: number;
  missed_chars: number | null;
  keystrokes: number;
  time_elapsed: number;
  word_history: unknown;
}

export type FriendRequestStatusRow = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface FriendRequestRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatusRow;
  created_at: string;
  responded_at: string | null;
}

export interface DeletedAccountRow {
  id: string;
  original_user_id: string | null;
  email: string | null;
  username: string | null;
  deleted_at: string;
  deletion_reason: string | null;
  data_export_url: string | null;
}

// ─── 🆕 Feature 4 — multiplayer race persistence (server-written only) ────────

export interface MultiplayerRaceRow {
  id: string;
  room_code: string;
  mode: 'time' | 'words';
  duration: number | null;
  word_count: number | null;
  word_set: string;
  player_count: number;
  finished_at: string;
  created_at: string;
}

export type MultiplayerResultRow = 'win' | 'loss' | 'draw';

export interface MultiplayerRaceParticipantRow {
  id: number;
  race_id: string;
  user_id: string;
  username: string;
  rank: number;
  wpm: number;
  raw_wpm: number;
  accuracy: number;
  result: MultiplayerResultRow;
  dnf: boolean;
  outlier_flag: boolean;
  created_at: string;
}

// ─── 🆕 Feature 3 (optional) — profile view tracking ───────────────────────────

export interface ProfileViewRow {
  id: number;
  profile_id: string;
  viewer_id: string | null;
  viewed_at: string;
}
