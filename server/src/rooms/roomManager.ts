import crypto from 'node:crypto';
import { roomStore, generateRoomCode } from './roomStore.js';
import type {
  RoomState,
  RoomSettings,
  RoomPlayer,
  RoomStateDTO,
  RoomListEntry,
} from './types.js';
import { COLOR_IDS, type ColorId } from './playerColors.js'; // 🆕 Part 1
import { generateRaceWords } from '../game/wordGeneration.js';
import { config } from '../config.js';

export class RoomError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

// ─── Password hashing (private rooms) ──────────────────────────────────────
// Plaintext passwords are never stored or broadcast — only a salted hash.
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// ─── Simple rate limiter for private-room password attempts ───────────────
// Keyed by `${userId}:${roomId}` — a few bad guesses are fine, brute forcing
// isn't. This is intentionally in-memory/best-effort for MVP.
const passwordAttempts = new Map<string, { count: number; firstAttemptAt: number }>();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string, roomId: string) {
  const key = `${userId}:${roomId}`;
  const entry = passwordAttempts.get(key);
  const now = Date.now();
  if (!entry || now - entry.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    passwordAttempts.set(key, { count: 1, firstAttemptAt: now });
    return;
  }
  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    throw new RoomError('RATE_LIMITED', 'Too many password attempts. Try again in a minute.');
  }
}

// ─── Player colors (Part 1) ────────────────────────────────────────────────
// Server is the source of truth for color assignment, following the same
// pattern as every other room mutation below.

/**
 * First unused color among currently non-abandoned players. Abandoned
 * players are excluded from the "taken" set so their color frees up
 * immediately, per spec — they stay in the room (for the results screen)
 * but shouldn't block a color from being reused.
 */
function assignColor(room: RoomState): ColorId {
  const taken = new Set(
    [...room.players.values()]
      .filter((p) => p.connection !== 'abandoned')
      .map((p) => p.colorId)
  );
  const free = COLOR_IDS.find((c) => !taken.has(c));
  // Palette (8) vs maxPlayers (up to 10) can theoretically run out — fall
  // back to cycling rather than throwing, since a duplicate color here is a
  // cosmetic degradation, not a correctness break.
  return free ?? COLOR_IDS[room.players.size % COLOR_IDS.length];
}

export function setPlayerColor(roomId: string, userId: string, colorId: ColorId): RoomState {
  const room = getRoomOrThrow(roomId);
  const player = room.players.get(userId);
  if (!player) throw new RoomError('NOT_IN_ROOM', 'You are not in this room.');

  const takenBy = [...room.players.values()].find(
    (p) => p.userId !== userId && p.colorId === colorId && p.connection !== 'abandoned'
  );
  if (takenBy) throw new RoomError('COLOR_TAKEN', 'Another player already has that color.');

  player.colorId = colorId;
  room.lastActivityAt = Date.now();
  return room;
}

// ─── DTO conversion ─────────────────────────────────────────────────────────

export function toDTO(room: RoomState): RoomStateDTO {
  return {
    id: room.id,
    hostUserId: room.hostUserId,
    settings: {
      ...room.settings,
      passwordHash: undefined,
      hasPassword: !!room.settings.passwordHash,
    } as any,
    status: room.status,
    players: [...room.players.values()].map(({ socketId, ...rest }) => rest),
    startTimestamp: room.startTimestamp,
    createdAt: room.createdAt,
    returnToLobbyVotes: [...room.returnToLobbyVotes], // 🆕 Part 5
  };
}

export function toListEntry(room: RoomState): RoomListEntry {
  const host = room.players.get(room.hostUserId);
  const activePlayers = [...room.players.values()].filter((p) => !p.isSpectator);
  return {
    id: room.id,
    name: room.settings.name,
    hostUsername: host?.username ?? 'Unknown',
    mode: room.settings.mode,
    playerCount: activePlayers.length,
    maxPlayers: room.settings.maxPlayers,
    status: room.status,
    visibility: room.settings.visibility,
  };
}

export function listPublicRooms(): RoomListEntry[] {
  return roomStore
    .all()
    .filter((r) => r.settings.visibility === 'public')
    .map(toListEntry);
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

export function createRoom(
  host: { userId: string; username: string; avatarUrl: string | null },
  settingsInput: Omit<RoomSettings, 'passwordHash'> & { password?: string },
): RoomState {
  const { password, ...settingsRest } = settingsInput;

  if (settingsRest.maxPlayers < 2 || settingsRest.maxPlayers > 10) {
    throw new RoomError('INVALID_SETTINGS', 'maxPlayers must be between 2 and 10.');
  }
  if (settingsRest.visibility === 'private' && !password) {
    throw new RoomError('INVALID_SETTINGS', 'Private rooms require a password.');
  }

  const id = generateRoomCode();
  const now = Date.now();

  const hostPlayer: RoomPlayer = {
    userId: host.userId,
    username: host.username,
    avatarUrl: host.avatarUrl,
    colorId: COLOR_IDS[0], // 🆕 Part 1 — first color; room has only the host so far
    isHost: true,
    isReady: true, // host is implicitly ready
    isSpectator: false,
    connection: 'connected',
    disconnectedAt: null,
    socketId: null,
    progress: null,
    finalStats: null,
    joinedAt: now,
  };

  const room: RoomState = {
    id,
    hostUserId: host.userId,
    settings: {
      ...settingsRest,
      passwordHash: password ? hashPassword(password) : undefined,
    },
    status: 'waiting',
    players: new Map([[host.userId, hostPlayer]]),
    raceWords: null,
    startTimestamp: null,
    createdAt: now,
    lastActivityAt: now,
    returnToLobbyVotes: new Set(), // 🆕 Part 5
  };

  roomStore.set(id, room);
  return room;
}

export function getRoomOrThrow(roomId: string): RoomState {
  const room = roomStore.get(roomId);
  if (!room) throw new RoomError('ROOM_NOT_FOUND', `Room ${roomId} does not exist.`);
  return room;
}

export function joinRoom(
  roomId: string,
  user: { userId: string; username: string; avatarUrl: string | null },
  password: string | undefined,
): { room: RoomState; asSpectator: boolean } {
  const room = getRoomOrThrow(roomId);

  if (room.settings.visibility === 'private') {
    checkRateLimit(user.userId, roomId);
    if (!password || hashPassword(password) !== room.settings.passwordHash) {
      throw new RoomError('BAD_PASSWORD', 'Incorrect room password.');
    }
  }

  const existing = room.players.get(user.userId);
  if (existing) {
    // Rejoin (e.g. reconnect flow handles this separately, but a plain
    // re-join from the room browser should just resume their existing seat).
    // Deliberately does NOT touch colorId — a returning player keeps the
    // color they already had.
    existing.connection = 'connected';
    existing.disconnectedAt = null;
    room.lastActivityAt = Date.now();
    return { room, asSpectator: existing.isSpectator };
  }

  const activePlayers = [...room.players.values()].filter((p) => !p.isSpectator);
  const isFull = activePlayers.length >= room.settings.maxPlayers;
  const isRacing = room.status === 'racing' || room.status === 'countdown';

  // Public+Full or Public+Racing → spectate (read-only), per spec.
  const asSpectator = isFull || isRacing;

  const player: RoomPlayer = {
    userId: user.userId,
    username: user.username,
    avatarUrl: user.avatarUrl,
    colorId: assignColor(room), // 🆕 Part 1
    isHost: false,
    isReady: false,
    isSpectator: asSpectator,
    connection: 'connected',
    disconnectedAt: null,
    socketId: null,
    progress: null,
    finalStats: null,
    joinedAt: Date.now(),
  };

  room.players.set(user.userId, player);
  room.lastActivityAt = Date.now();
  return { room, asSpectator };
}

export function leaveRoom(roomId: string, userId: string): { room: RoomState | null; destroyed: boolean } {
  const room = roomStore.get(roomId);
  if (!room) return { room: null, destroyed: false };

  room.players.delete(userId);
  room.returnToLobbyVotes.delete(userId); // 🆕 Part 5 — leaving player drops out of the vote count too
  room.lastActivityAt = Date.now();

  // 🐛 FIX: previously this only destroyed the room when players.size === 0,
  // which meant a room with zero ACTIVE players but one or more lingering
  // spectators never got cleaned up — and if the departing user was the
  // host, migrateHost() below would find no eligible replacement (spectators
  // don't count) and leave hostUserId pointing at a userId no longer in the
  // room at all. That broken room then sat around until the 20-minute idle
  // sweep. A race with no participants isn't a race — treat "no active
  // players" as empty, same as "no players at all". We still return the
  // room object (with its remaining spectators, if any) so the caller in
  // socket/handlers.ts can notify them and clean up its own bookkeeping.
  const activePlayers = [...room.players.values()].filter((p) => !p.isSpectator);
  const shouldDestroy = room.players.size === 0 || activePlayers.length === 0;

  if (shouldDestroy) {
    roomStore.delete(roomId);
    return { room, destroyed: true };
  }

  if (room.hostUserId === userId) {
    migrateHost(room);
  }

  // 🆕 Part 5 — the departing player might have been the last hold-out vote;
  // re-check whether everyone remaining has now voted.
  maybeTransitionToLobby(room);

  return { room, destroyed: false };
}

/** Promotes the next-earliest-joined connected player to host. No-op mid-race per spec. */
export function migrateHost(room: RoomState): RoomPlayer | null {
  if (room.status === 'racing' || room.status === 'countdown') return null;

  const candidates = [...room.players.values()]
    .filter((p) => p.connection === 'connected' && !p.isSpectator)
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const next = candidates[0] ?? null;
  const prevHost = room.players.get(room.hostUserId);
  if (prevHost) prevHost.isHost = false;

  if (next) {
    next.isHost = true;
    next.isReady = true;
    room.hostUserId = next.userId;
  }
  return next;
}

export function setReady(roomId: string, userId: string, isReady: boolean): RoomState {
  const room = getRoomOrThrow(roomId);
  const player = room.players.get(userId);
  if (!player) throw new RoomError('NOT_IN_ROOM', 'You are not in this room.');
  if (player.isHost) return room; // host is always "ready" — start button gates progress instead
  player.isReady = isReady;
  room.lastActivityAt = Date.now();
  return room;
}

export function updateSettings(roomId: string, hostUserId: string, patch: Partial<RoomSettings>): RoomState {
  const room = getRoomOrThrow(roomId);
  assertHost(room, hostUserId);
  if (room.status !== 'waiting') {
    throw new RoomError('RACE_IN_PROGRESS', 'Cannot change settings while a race is in progress.');
  }
  Object.assign(room.settings, patch);
  room.lastActivityAt = Date.now();
  return room;
}

export function kickPlayer(roomId: string, hostUserId: string, targetUserId: string): RoomState {
  const room = getRoomOrThrow(roomId);
  assertHost(room, hostUserId);
  if (targetUserId === hostUserId) throw new RoomError('INVALID_ACTION', "Host can't kick themselves.");
  room.players.delete(targetUserId);
  room.returnToLobbyVotes.delete(targetUserId); // 🆕 Part 5
  room.lastActivityAt = Date.now();
  maybeTransitionToLobby(room); // 🆕 Part 5 — kicking someone might complete the vote
  return room;
}

export function transferHost(roomId: string, currentHostUserId: string, targetUserId: string): RoomState {
  const room = getRoomOrThrow(roomId);
  assertHost(room, currentHostUserId);
  const target = room.players.get(targetUserId);
  if (!target || target.isSpectator) throw new RoomError('INVALID_ACTION', 'Target is not an active player.');

  const prevHost = room.players.get(currentHostUserId);
  if (prevHost) prevHost.isHost = false;
  target.isHost = true;
  target.isReady = true;
  room.hostUserId = target.userId;
  room.lastActivityAt = Date.now();
  return room;
}

function assertHost(room: RoomState, userId: string) {
  if (room.hostUserId !== userId) throw new RoomError('NOT_HOST', 'Only the host can do that.');
}

// ─── Race lifecycle ─────────────────────────────────────────────────────────

const COUNTDOWN_MS = 3000; // 3-2-1

export function canStart(room: RoomState): boolean {
  const activePlayers = [...room.players.values()].filter((p) => !p.isSpectator);
  if (activePlayers.length < 2) return false; // racing solo isn't really "multiplayer"
  return activePlayers.every((p) => p.isHost || p.isReady);
}

export function startRace(roomId: string, hostUserId: string): RoomState {
  const room = getRoomOrThrow(roomId);
  assertHost(room, hostUserId);
  if (room.status !== 'waiting') throw new RoomError('INVALID_STATE', 'Race already started.');
  if (!canStart(room)) throw new RoomError('NOT_READY', 'Not all players are ready.');

  const count = room.settings.mode === 'words' ? room.settings.wordCount : 80;
  room.raceWords = generateRaceWords(room.settings.wordSet, count, {
    punctuation: room.settings.punctuation,
    numbers: room.settings.numbers,
  });
  room.status = 'countdown';
  // Server time is authoritative — clients compute their own countdown as
  // `startTimestamp - Date.now()`, never trusting a locally-started timer.
  room.startTimestamp = Date.now() + COUNTDOWN_MS;
  room.lastActivityAt = Date.now();

  for (const p of room.players.values()) {
    if (!p.isSpectator) {
      p.progress = { wordIndex: 0, completedChars: 0, elapsedMs: 0, wpm: 0, rawWpm: 0, accuracy: 100, updatedAt: Date.now() };
      p.finalStats = null;
    }
  }

  // Flip countdown -> racing once the countdown actually elapses server-side.
  setTimeout(() => {
    const r = roomStore.get(roomId);
    if (r && r.status === 'countdown') {
      r.status = 'racing';
    }
  }, COUNTDOWN_MS);

  return room;
}

export function recordProgress(
  roomId: string,
  userId: string,
  progress: { wordIndex: number; completedChars: number; elapsedMs: number; wpm: number; rawWpm: number; accuracy: number },
) {
  const room = roomStore.get(roomId);
  if (!room || room.status !== 'racing') return;
  const player = room.players.get(userId);
  if (!player || player.isSpectator) return;
  player.progress = { ...progress, updatedAt: Date.now() };
  room.lastActivityAt = Date.now();
}

export function finishRace(room: RoomState): boolean {
  const activePlayers = [...room.players.values()].filter((p) => !p.isSpectator);
  const allDone = activePlayers.every(
    (p) => p.finalStats !== null || p.connection === 'abandoned',
  );
  if (allDone) {
    room.status = 'finished';
  }
  return allDone;
}

export function markAbandoned(room: RoomState, userId: string) {
  const player = room.players.get(userId);
  if (!player) return;
  player.connection = 'abandoned';
  player.finalStats = {
    wpm: 0,
    rawWpm: 0,
    accuracy: 0,
    finishedAt: null,
    dnf: true,
    outlierFlag: false,
  };
  room.returnToLobbyVotes.delete(userId); // 🆕 Part 5 — abandoned players drop out of vote bookkeeping
  maybeTransitionToLobby(room); // 🆕 Part 5 — abandonment might complete the vote for everyone left
}

// ─── Return-to-lobby vote (Part 5) ──────────────────────────────────────────

export function voteReturnToLobby(roomId: string, userId: string, optIn: boolean): RoomState {
  const room = getRoomOrThrow(roomId);
  if (room.status !== 'finished') {
    throw new RoomError('INVALID_STATE', 'Can only vote to return to lobby after a race finishes.');
  }
  const player = room.players.get(userId);
  if (!player || player.isSpectator) {
    throw new RoomError('NOT_IN_ROOM', 'You are not an active player in this room.');
  }

  if (optIn) room.returnToLobbyVotes.add(userId);
  else room.returnToLobbyVotes.delete(userId);
  room.lastActivityAt = Date.now();

  maybeTransitionToLobby(room);
  return room;
}

/**
 * Checks whether every currently-active (non-spectator, non-abandoned)
 * player has opted in, and if so transitions the room back to 'waiting'.
 * Called after every vote change AND after leave/kick/abandon, since any of
 * those can change the denominator and complete the vote without a new
 * click — there's deliberately no special-casing of "the last click".
 */
function maybeTransitionToLobby(room: RoomState) {
  if (room.status !== 'finished') return;

  const activePlayers = [...room.players.values()].filter(
    (p) => !p.isSpectator && p.connection !== 'abandoned'
  );
  if (activePlayers.length === 0) return;

  const allVoted = activePlayers.every((p) => room.returnToLobbyVotes.has(p.userId));
  if (!allVoted) return;

  // 🆕 Part 5 — finished -> waiting. Preserve room code, password, settings,
  // and each player's colorId. Reset everything race-specific and clear votes.
  room.status = 'waiting';
  room.raceWords = null;
  room.startTimestamp = null;
  room.returnToLobbyVotes.clear();

  for (const p of room.players.values()) {
    if (p.connection === 'abandoned') continue; // excluded from reappearing per spec
    p.finalStats = null;
    p.progress = null;
    p.isReady = p.isHost; // same "host implicitly ready" convention as createRoom
  }

  // Bump activity so cleanupSweep's idle-room GC doesn't reap a room that
  // just came back to life.
  room.lastActivityAt = Date.now();
}

// ─── Cleanup sweep ──────────────────────────────────────────────────────────

/** Called every config.cleanupSweepIntervalMs. Returns destroyed room IDs. */
export function sweepStaleRooms(): string[] {
  const now = Date.now();
  const destroyed: string[] = [];

  for (const room of roomStore.all()) {
    const idle = now - room.lastActivityAt > config.idleRoomTimeoutMs;
    // 🐛 FIX: same "no active players" bug as leaveRoom — a room with only
    // spectators (or zero players at all) has nothing left to sweep for.
    const activePlayers = [...room.players.values()].filter((p) => !p.isSpectator);
    const empty = room.players.size === 0 || activePlayers.length === 0;

    if (empty || idle) {
      roomStore.delete(room.id);
      destroyed.push(room.id);
    }
  }
  return destroyed;
}

/** Called on the same sweep tick — expires mid-race disconnect grace periods. */
export function expireDisconnectGrace(): { roomId: string; userId: string }[] {
  const now = Date.now();
  const expired: { roomId: string; userId: string }[] = [];

  for (const room of roomStore.all()) {
    if (room.status !== 'racing') continue;
    for (const player of room.players.values()) {
      if (
        player.connection === 'disconnected' &&
        player.disconnectedAt &&
        now - player.disconnectedAt > config.reconnectGraceMs
      ) {
        markAbandoned(room, player.userId);
        expired.push({ roomId: room.id, userId: player.userId });
      }
    }
  }
  return expired;
}
