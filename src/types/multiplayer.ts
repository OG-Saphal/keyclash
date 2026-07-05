import type { TestMode, WordSet } from './index';

export type RoomVisibility = 'public' | 'private';
export type RoomStatus = 'waiting' | 'countdown' | 'racing' | 'finished';
export type PlayerConnectionState = 'connected' | 'disconnected' | 'abandoned';

export interface RoomSettingsDTO {
  name: string;
  mode: TestMode;
  duration: 15 | 30 | 60 | 120;
  wordCount: 10 | 25 | 50 | 100;
  wordSet: WordSet;
  punctuation: boolean;
  numbers: boolean;
  maxPlayers: number;
  visibility: RoomVisibility;
  hasPassword: boolean;
}

export interface RoomPlayerDTO {
  userId: string;
  username: string;
  avatarUrl: string | null;
  isHost: boolean;
  isReady: boolean;
  isSpectator: boolean;
  connection: PlayerConnectionState;
  disconnectedAt: number | null;
  progress: {
    wordIndex: number;
    elapsedMs: number;
    wpm: number;
    rawWpm: number;
    accuracy: number;
    updatedAt: number;
  } | null;
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

export interface RoomStateDTO {
  id: string;
  hostUserId: string;
  settings: RoomSettingsDTO;
  status: RoomStatus;
  players: RoomPlayerDTO[];
  startTimestamp: number | null;
  createdAt: number;
}

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

export interface CreateRoomInput {
  name: string;
  mode: TestMode;
  duration: 15 | 30 | 60 | 120;
  wordCount: 10 | 25 | 50 | 100;
  wordSet: WordSet;
  punctuation: boolean;
  numbers: boolean;
  maxPlayers: number;
  visibility: RoomVisibility;
  password?: string;
}

export interface QuickMatchSettings {
  mode: TestMode;
  wordSet: WordSet;
}

export interface ServerErrorPayload {
  forEvent: string;
  code: string;
  message: string;
}
