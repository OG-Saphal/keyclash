// Mirrors the frontend's src/types/index.ts config unions so the two sides
// never disagree on what a valid mode/wordSet/duration is.
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
