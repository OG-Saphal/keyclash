import { io, type Socket } from 'socket.io-client';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import type {
  RoomStateDTO,
  RoomListEntry,
  CreateRoomInput,
  QuickMatchSettings,
  ServerErrorPayload,
} from '../types/multiplayer';

const SERVER_URL = import.meta.env.VITE_MULTIPLAYER_SERVER_URL as string;

let socket: Socket | null = null;

/**
 * Connects the multiplayer socket, authenticated with the CURRENT Supabase
 * session's access token (handshake auth payload — see server's
 * src/index.ts io.use()). Guests should never reach this: gate the call at
 * the UI layer (Multiplayer menu shows a login modal instead).
 */
export async function connectMultiplayerSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error('Must be logged in to use multiplayer.');

  // 🐛 FIX: avatarUrl was being read from session.user.user_metadata, which
  // never has it — KeyClash stores avatar_url in the `profiles` table, and
  // useAuthStore.user is already the mapped profile (see auth.service.ts
  // rowToProfile). Reading from user_metadata meant every player's avatar
  // silently came through as null. Reading from the auth store's profile
  // fixes it, and also gives a consistent username (falls back the same way
  // the rest of the app does).
  const profile = useAuthStore.getState().user;

  socket = io(SERVER_URL, {
    auth: {
      token: session.access_token,
      username: profile?.username ?? profile?.displayName ?? session.user.email ?? 'Player',
      avatarUrl: profile?.avatarUrl ?? null,
    },
    // Reconnect automatically on network blips; room:rejoin handles resuming
    // room state once we're back — see useMultiplayerStore.
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return new Promise((resolve, reject) => {
    socket!.once('connect', () => resolve(socket!));
    socket!.once('connect_error', (e) => reject(e));
  });
}

export function disconnectMultiplayerSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket {
  if (!socket) throw new Error('Multiplayer socket not connected. Call connectMultiplayerSocket() first.');
  return socket;
}

// ─── Typed emit helpers ─────────────────────────────────────────────────────
// Thin, typed wrappers so the store/components never touch raw socket.emit
// strings directly (keeps the wire protocol centralized in one file, per the
// existing <domain>.service.ts convention).

export function requestRoomList() {
  getSocket().emit('room:list_request');
}

export function createRoom(input: CreateRoomInput): Promise<{ ok: boolean; room?: RoomStateDTO }> {
  return new Promise((resolve) => getSocket().emit('room:create', input, resolve));
}

export function joinRoom(roomId: string, password?: string): Promise<{ ok: boolean; room?: RoomStateDTO; asSpectator?: boolean }> {
  return new Promise((resolve) => getSocket().emit('room:join', { roomId, password }, resolve));
}

export function rejoinRoom(roomId: string): Promise<{ ok: boolean; room?: RoomStateDTO }> {
  return new Promise((resolve) => getSocket().emit('room:rejoin', { roomId }, resolve));
}

export function leaveRoom(roomId: string) {
  getSocket().emit('room:leave', { roomId });
}

export function setReady(roomId: string, isReady: boolean) {
  getSocket().emit('lobby:ready', { roomId, isReady });
}

export function updateRoomSettings(roomId: string, patch: Partial<CreateRoomInput>) {
  getSocket().emit('lobby:update_settings', { roomId, patch });
}

export function kickPlayer(roomId: string, targetUserId: string) {
  getSocket().emit('lobby:kick', { roomId, targetUserId });
}

export function transferHost(roomId: string, targetUserId: string) {
  getSocket().emit('lobby:transfer_host', { roomId, targetUserId });
}

export function startRace(roomId: string) {
  getSocket().emit('lobby:start', { roomId });
}

export function sendProgress(
  roomId: string,
  progress: { wordIndex: number; elapsedMs: number; wpm: number; rawWpm: number; accuracy: number },
) {
  getSocket().emit('race:progress', { roomId, ...progress });
}

export function finishRace(
  roomId: string,
  submission: {
    completedCorrectWords: number;
    totalKeystrokes: number;
    totalCorrectChars: number;
    totalIncorrectChars: number;
    clientElapsedMs: number;
  },
): Promise<{ ok: boolean; stats?: { wpm: number; rawWpm: number; accuracy: number; outlierFlag: boolean } }> {
  return new Promise((resolve) => getSocket().emit('race:finish', { roomId, ...submission }, resolve));
}

export function joinQuickMatch(settings: QuickMatchSettings) {
  getSocket().emit('quickmatch:join', settings);
}

export function cancelQuickMatch() {
  getSocket().emit('quickmatch:cancel');
}

// ─── Event subscription helpers ─────────────────────────────────────────────
// The store calls these once, on socket connect, to wire server pushes into
// Zustand state. Exported as named functions (rather than the store
// importing `socket` directly) so the raw Socket instance stays encapsulated
// in this file.

export function onRoomUpdated(cb: (room: RoomStateDTO) => void) {
  getSocket().on('room:updated', cb);
}
export function onRoomListUpdated(cb: (rooms: RoomListEntry[]) => void) {
  getSocket().on('room:list_updated', cb);
}
export function onRoomClosed(cb: (payload: { roomId: string; reason: string }) => void) {
  getSocket().on('room:closed', cb);
}
export function onLobbyKicked(cb: (payload: { targetUserId: string }) => void) {
  getSocket().on('lobby:kicked', cb);
}
export function onRaceWords(cb: (payload: { words: string[]; startTimestamp: number }) => void) {
  getSocket().on('race:words', cb);
}
export function onRaceProgressBroadcast(
  cb: (payload: { userId: string; wordIndex: number; elapsedMs: number; wpm: number; rawWpm: number; accuracy: number }) => void,
) {
  getSocket().on('race:progress_broadcast', cb);
}
export function onRaceResults(cb: (room: RoomStateDTO) => void) {
  getSocket().on('race:results', cb);
}
export function onQuickMatchFound(cb: (payload: { room: RoomStateDTO }) => void) {
  getSocket().on('quickmatch:found', cb);
}
export function onServerError(cb: (payload: ServerErrorPayload) => void) {
  getSocket().on('error', cb);
}
