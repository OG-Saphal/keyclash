import { io, type Socket } from 'socket.io-client';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { usePresenceStore } from '../store/usePresenceStore';
import { useInviteStore } from '../store/useInviteStore';
import type {
  RoomStateDTO,
  RoomListEntry,
  CreateRoomInput,
  QuickMatchSettings,
  ServerErrorPayload,
} from '../types/multiplayer';
import type { ColorId } from '../data/playerColors'; // 🆕 Part 1

const SERVER_URL = import.meta.env.VITE_MULTIPLAYER_SERVER_URL as string;

let socket: Socket | null = null;

export async function connectMultiplayerSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error('Must be logged in to use multiplayer.');

  const profile = useAuthStore.getState().user;

  socket = io(SERVER_URL, {
    auth: {
      token: session.access_token,
      username: profile?.username ?? profile?.displayName ?? session.user.email ?? 'Player',
      avatarUrl: profile?.avatarUrl ?? null,
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  // ─── Presence listeners ──────────────────────────────────────────────────
  socket.on('presence:update', (data: { onlineUsers: string[] }) => {
    usePresenceStore.getState().setOnlineUsers(data.onlineUsers);
  });

  socket.on('user:connected', (userId: string) => {
    usePresenceStore.getState().addOnlineUser(userId);
  });

  socket.on('user:disconnected', (userId: string) => {
    usePresenceStore.getState().removeOnlineUser(userId);
  });

  // ─── Room invite listener ──────────────────────────────────────────────
  socket.on('room:invited', (data) => {
    useInviteStore.getState().setInvite(data);
  });

  // ─── Reconnection: server will push fresh presence and room state ──────
  socket.on('connect', () => {
    // The server will send a new presence:update and room:updated if needed.
    // No need to re‑register listeners here.
  });

  return new Promise((resolve, reject) => {
    socket!.once('connect', () => resolve(socket!));
    socket!.once('connect_error', (e) => reject(e));
  });
}

export function disconnectMultiplayerSocket() {
  if (socket) {
    socket.off('presence:update');
    socket.off('user:connected');
    socket.off('user:disconnected');
    socket.off('room:invited');
    socket.off('connect');
    socket.disconnect();
  }
  socket = null;
}

export function getSocket(): Socket {
  if (!socket) throw new Error('Multiplayer socket not connected. Call connectMultiplayerSocket() first.');
  return socket;
}

// ─── Room invites ─────────────────────────────────────────────────────────────
export function inviteToRoom(roomId: string, targetUserId: string) {
  getSocket().emit('room:invite', { roomId, targetUserId });
}

// ─── Typed emit helpers ─────────────────────────────────────────────────────

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

// 🆕 Part 1 — color selection
export function setColor(roomId: string, colorId: ColorId): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => getSocket().emit('lobby:set_color', { roomId, colorId }, resolve));
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

// 🆕 Part 2 — completedChars added, additive to the existing fields
export function sendProgress(
  roomId: string,
  progress: { wordIndex: number; completedChars: number; elapsedMs: number; wpm: number; rawWpm: number; accuracy: number },
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

// 🆕 Part 5 — return-to-lobby vote toggle
export function voteReturnToLobby(roomId: string, optIn: boolean): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => getSocket().emit('room:return_to_lobby_vote', { roomId, optIn }, resolve));
}

// ─── Event subscription helpers ─────────────────────────────────────────────
// These are used by the store to register callbacks for server events.
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
  cb: (payload: {
    userId: string;
    wordIndex: number;
    completedChars: number; // 🆕 Part 2
    elapsedMs: number;
    wpm: number;
    rawWpm: number;
    accuracy: number;
  }) => void,
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
export function onRoomInvited(cb: (payload: { roomId: string; inviterUsername: string; roomName: string }) => void) {
  getSocket().on('room:invited', cb);
}