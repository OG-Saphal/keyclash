// Mirrors the frontend's src/types/index.ts config unions so the two sides
// never disagree on what a valid mode/wordSet/duration is.
import type { ColorId } from './playerColors.js';

export type TestMode = 'time' | 'words';
export type WordSet = 'english200' | 'english1k' | 'common';

export type RoomVisibility = 'public' | 'private';
export type RoomStatus = 'waiting' | 'countdown' | 'racing' | 'finished';
export type PlayerConnectionState = 'connected' | 'disconnected' | 'abandoned';

export interface RoomSettings {
  name: string;
  mode: TestMode;
  duration: 15 | 30 | 60 | 120; // used when mode === 'time'
  wordCount: 10 | 25 | 50 | 100; // used when mode === 'words'
  wordSet: WordSet;
  punctuation: boolean;
  numbers: boolean;
  maxPlayers: number; // 2-10
  visibility: RoomVisibility;
  // Plaintext is never stored — see roomManager.hashPassword. Undefined for public rooms.
  passwordHash?: string;
}

export interface PlayerProgressSnapshot {
  wordIndex: number;
  // 🆕 Part 2 — absolute character offset into the race text (correct +
  // incorrect chars typed so far, i.e. "how far along the paragraph is this
  // player's caret"), NOT just a count of correct chars. See roomManager.ts
  // / useMultiplayerStore.ts comments for why this deviates from the literal
  // "completedChars = correct chars" wording in the original task write-up:
  // a typo still occupies a position in the text, so caret placement needs
  // the client's forward-typed offset, not the anti-cheat-relevant correct
  // count (which is a separate, already-existing concern handled by
  // totalCorrectChars/totalIncorrectChars in the typing engine + metrics.ts).
  completedChars: number;
  elapsedMs: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  updatedAt: number;
}

export interface RoomPlayer {
  userId: string;
  username: string;
  avatarUrl: string | null;
  colorId: ColorId; // 🆕 Part 1 — server-assigned, never accepted from the client without validation
  isHost: boolean;
  isReady: boolean;
  isSpectator: boolean;
  connection: PlayerConnectionState;
  disconnectedAt: number | null; // ms timestamp, used for grace-period expiry
  socketId: string | null; // current socket — NEVER used as identity, only for emits
  progress: PlayerProgressSnapshot | null;
  finalStats: {
    wpm: number;
    rawWpm: number;
    accuracy: number;
    finishedAt: number | null;
    dnf: boolean;
    outlierFlag: boolean;
  } | null;
  joinedAt: number;
}

export interface RoomState {
  id: string; // room code, e.g. "K3F9AB"
  hostUserId: string;
  settings: RoomSettings;
  status: RoomStatus;
  players: Map<string, RoomPlayer>; // keyed by userId
  raceWords: string[] | null; // generated once, on start
  startTimestamp: number | null; // server clock, ms — used for synced countdown
  createdAt: number;
  lastActivityAt: number;
  // 🆕 Part 5 — userIds of active players who've opted in to a rematch.
  // Cleared whenever the room transitions back to 'waiting'.
  returnToLobbyVotes: Set<string>;
  // 🐛 FIX (invite accept broken for private rooms) — userIds explicitly
  // invited by a CURRENT room member via room:invite. joinRoom() waives the
  // password requirement for anyone in this set, since they've already been
  // vetted by someone who's actually in the room — the invite itself is the
  // authorization, the same way a party host handing you the door code is.
  // Never sent to clients (see toDTO) and never trusted from the client —
  // only server-side room:invite handling ever adds to it.
  invitedUserIds: Set<string>;
}

/** Shape sent to clients — Maps don't serialize, password hash never leaves the server. */
export interface RoomStateDTO {
  id: string;
  hostUserId: string;
  settings: Omit<RoomSettings, 'passwordHash'> & { hasPassword: boolean };
  status: RoomStatus;
  players: Omit<RoomPlayer, 'socketId'>[];
  startTimestamp: number | null;
  createdAt: number;
  returnToLobbyVotes: string[]; // 🆕 Part 5 — userIds; client derives "X of Y" from active player count
}

/** Row shown in the public Room Browser list — deliberately minimal. */
export interface RoomListEntry {
  id: string;
  name: string;
  hostUsername: string;
  mode: TestMode;
  playerCount: number;
  maxPlayers: number;
  status: RoomStatus;
  visibility: RoomVisibility;
}
