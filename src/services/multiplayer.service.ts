import { io, type Socket } from 'socket.io-client';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { usePresenceStore } from '../store/usePresenceStore';
import { useInviteStore } from '../store/useInviteStore';
import { useConnectionStore } from '../store/useConnectionStore';
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

// Guards against re-entrant first-time connection calls (e.g. voiceService's
// ensureSocketAndListeners() and a component effect both calling
// connectMultiplayerSocket() in the same tick) racing each other into two
// separate io(...) instances. See RCA §3.3 / §5.3.
let connectingPromise: Promise<Socket> | null = null;

export async function connectMultiplayerSocket(): Promise<Socket> {
  // Case 1 — already connected: reuse immediately.
  if (socket?.connected) return socket;

  // Case 2 — a socket instance already exists but is currently disconnected /
  // mid-reconnect (e.g. waiting out a Render cold start). The old guard only
  // checked `.connected`, so a call arriving during this window would fall
  // through and construct a brand-new Socket.IO client, orphaning anything
  // (like voiceService) that had already captured a reference to the old one.
  // Instead, wait for the existing instance to either reconnect or exhaust
  // its retry budget. See RCA §3.3 / §5.3.
  if (socket) {
    const existing = socket;
    return new Promise((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve(existing);
      };
      const onFailed = () => {
        cleanup();
        reject(new Error('Multiplayer socket failed to reconnect.'));
      };
      const cleanup = () => {
        existing.off('connect', onConnect);
        existing.io.off('reconnect_failed', onFailed);
      };
      existing.once('connect', onConnect);
      existing.io.once('reconnect_failed', onFailed);
    });
  }

  // Case 3 — no socket yet at all, but another caller may already be in the
  // middle of creating the first one. Share that in-flight promise instead
  // of starting a second connection attempt.
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Must be logged in to use multiplayer.');

    socket = io(SERVER_URL, {
      // Fix for RCA §3.2 — a plain object is evaluated once, at the moment
      // io(...) is first called, and that frozen object is resent on every
      // later reconnection attempt. If the server was asleep for 15+ minutes
      // (Render cold start) the captured access_token can easily have
      // expired by the time a reconnect actually happens, causing the
      // reconnect to fail even though the server woke up in time.
      //
      // Passing a function instead makes Socket.IO call it fresh — fetching
      // a current session — on every single connection AND reconnection
      // attempt, so a stale token is never resent.
      auth: (cb) => {
        supabase.auth.getSession().then(({ data: freshData }) => {
          const profile = useAuthStore.getState().user;
          cb({
            token: freshData.session?.access_token,
            username:
              profile?.username ?? profile?.displayName ?? freshData.session?.user.email ?? 'Player',
            avatarUrl: profile?.avatarUrl ?? null,
          });
        });
      },
      // Fix for RCA §3.1 — the previous config (10 attempts, 1s base delay,
      // 5s default max delay) sums to roughly 35–45s of total retry budget,
      // which frequently isn't enough to outlast a genuine Render cold start
      // (often 30–60s+). Retrying indefinitely with a longer max backoff
      // means the client keeps trying instead of giving up silently forever,
      // and a longer per-attempt timeout gives slow wake-ups room to succeed.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    registerCoreListeners(socket);

    await new Promise<void>((resolve, reject) => {
      socket!.once('connect', () => resolve());
      socket!.once('connect_error', (e) => reject(e));
    });

    return socket!;
  })();

  try {
    return await connectingPromise;
  } finally {
    // Whether it succeeded or failed, this attempt is no longer "in flight" —
    // clear it so a future call can start a fresh attempt if needed.
    connectingPromise = null;
  }
}

function registerCoreListeners(s: Socket) {
  // ─── Presence listeners ──────────────────────────────────────────────────
  s.on('presence:update', (data: { onlineUsers: string[] }) => {
    usePresenceStore.getState().setOnlineUsers(data.onlineUsers);
  });

  s.on('user:connected', (userId: string) => {
    usePresenceStore.getState().addOnlineUser(userId);
  });

  s.on('user:disconnected', (userId: string) => {
    usePresenceStore.getState().removeOnlineUser(userId);
  });

  // ─── Room invite listener ────────────────────────────────────────────────
  s.on('room:invited', (data) => {
    useInviteStore.getState().setInvite(data);
  });

  // ─── Connection status (fix for RCA §3.1 "no error surfaced") ───────────
  // The old code had no listener for reconnect_failed at all, so once the
  // retry budget was exhausted the socket just sat there disconnected with
  // no feedback anywhere in the UI. useConnectionStore lets any component
  // (e.g. a small banner) reflect current status and offer a manual retry.
  useConnectionStore.getState().setStatus('connected');

  s.on('connect', () => {
    useConnectionStore.getState().setStatus('connected');
    // The server will send a new presence:update and room:updated if needed.
    // voiceService independently listens on 'connect' to decide whether it
    // should rejoin voice for the current room.
  });

  s.on('disconnect', () => {
    useConnectionStore.getState().setStatus('reconnecting');
  });

  s.io.on('reconnect_attempt', (attempt: number) => {
    useConnectionStore.getState().setStatus('reconnecting', attempt);
  });

  s.io.on('reconnect', (attempt: number) => {
    console.log(`[multiplayer] reconnected after ${attempt} attempt(s)`);
    useConnectionStore.getState().setStatus('connected');
  });

  s.io.on('reconnect_failed', () => {
    console.error('[multiplayer] reconnection attempts exhausted');
    useConnectionStore.getState().setStatus('failed');
  });
}

/** Manual retry for when a user dismisses/acts on a "connection lost" banner. */
export function forceReconnect(): Promise<Socket> {
  if (socket) {
    socket.connect();
    const existing = socket;
    return new Promise((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve(existing);
      };
      const onError = (e: Error) => {
        cleanup();
        reject(e);
      };
      const cleanup = () => {
        existing.off('connect', onConnect);
        existing.off('connect_error', onError);
      };
      existing.once('connect', onConnect);
      existing.once('connect_error', onError);
    });
  }
  return connectMultiplayerSocket();
}

export function disconnectMultiplayerSocket() {
  if (socket) {
    socket.off();
    socket.io.off();
    socket.disconnect();
  }
  socket = null;
  connectingPromise = null;
  useConnectionStore.getState().setStatus('disconnected');
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

export function joinRoom(
  roomId: string,
  password?: string,
): Promise<{ ok: boolean; room?: RoomStateDTO; asSpectator?: boolean; code?: string }> {
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
