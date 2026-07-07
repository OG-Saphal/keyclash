import type { Server, Socket } from 'socket.io';
import * as rooms from '../rooms/roomManager.js';
import { roomStore } from '../rooms/roomStore.js';
import { quickMatchQueue, type QueueEntry } from '../quickmatch/queue.js';
import { recomputeFinalStats, type FinalSubmission } from '../game/metrics.js';
import type { RoomState } from '../rooms/types.js';
import type { ColorId } from '../rooms/playerColors.js';

interface AuthedSocketData {
  userId: string;
  username: string;
  avatarUrl: string | null;
}

type AuthedSocket = Socket & { data: AuthedSocketData };

// ─── State ────────────────────────────────────────────────────────────────
// Tracks which room each connected userId is currently in, so a raw
// disconnect knows where to apply grace period.
const activeRoomByUser = new Map<string, string>();

// Maps userId → socketId for private messages (invites) & presence.
export const socketIdByUser = new Map<string, string>();

// ─── Helpers ──────────────────────────────────────────────────────────────

function broadcastRoom(io: Server, room: RoomState) {
  io.to(`room:${room.id}`).emit('room:updated', rooms.toDTO(room));
}

function broadcastRoomList(io: Server) {
  io.emit('room:list_updated', rooms.listPublicRooms());
}

function err(socket: Socket, event: string, e: unknown) {
  const message = e instanceof rooms.RoomError ? e.message : 'Something went wrong.';
  const code = e instanceof rooms.RoomError ? e.code : 'UNKNOWN';
  socket.emit('error', { forEvent: event, code, message });
}

// ─── Handlers registration ───────────────────────────────────────────────

export function registerRoomHandlers(io: Server, socket: AuthedSocket) {
  const me = () => ({ userId: socket.data.userId, username: socket.data.username, avatarUrl: socket.data.avatarUrl });

  // ── Room list ──
  socket.on('room:list_request', () => {
    socket.emit('room:list_updated', rooms.listPublicRooms());
  });

  // ── Create room ──
  socket.on('room:create', (settingsInput, cb) => {
    try {
      const room = rooms.createRoom(me(), settingsInput);
      const player = room.players.get(socket.data.userId)!;
      player.socketId = socket.id;
      socket.join(`room:${room.id}`);
      activeRoomByUser.set(socket.data.userId, room.id);
      cb?.({ ok: true, room: rooms.toDTO(room) });
      broadcastRoomList(io);
    } catch (e) {
      err(socket, 'room:create', e);
      cb?.({ ok: false });
    }
  });

  // ── Join room ──
  socket.on('room:join', ({ roomId, password }, cb) => {
    try {
      const { room, asSpectator } = rooms.joinRoom(roomId, me(), password);
      const player = room.players.get(socket.data.userId)!;
      player.socketId = socket.id;
      socket.join(`room:${room.id}`);
      activeRoomByUser.set(socket.data.userId, room.id);
      cb?.({ ok: true, room: rooms.toDTO(room), asSpectator });
      broadcastRoom(io, room);
      broadcastRoomList(io);
    } catch (e) {
      err(socket, 'room:join', e);
      cb?.({ ok: false });
    }
  });

  // ── Rejoin room ──
  // 🐛 FIX: a mid-race rejoin previously never received raceWords again —
  // race:words is only pushed once, right after countdown starts, via the
  // lobby:start handler below. A client reconnecting after that point got
  // room:updated (which carries startTimestamp but NOT raceWords) and
  // nothing else, so their WordDisplay had no text to render and would
  // silently desync from everyone else. Re-send the cached words/timestamp
  // directly to the rejoining socket (not a room broadcast — only this
  // client needs it) whenever the room is still mid-race.
  socket.on('room:rejoin', ({ roomId }, cb) => {
    try {
      const room = rooms.getRoomOrThrow(roomId);
      const player = room.players.get(socket.data.userId);
      if (!player) throw new rooms.RoomError('NOT_IN_ROOM', 'No seat reserved for you in this room.');
      player.connection = 'connected';
      player.disconnectedAt = null;
      player.socketId = socket.id;
      socket.join(`room:${room.id}`);
      activeRoomByUser.set(socket.data.userId, room.id);
      cb?.({ ok: true, room: rooms.toDTO(room) });
      broadcastRoom(io, room);
      if (room.raceWords && (room.status === 'racing' || room.status === 'countdown')) {
        socket.emit('race:words', { words: room.raceWords, startTimestamp: room.startTimestamp });
      }
    } catch (e) {
      err(socket, 'room:rejoin', e);
      cb?.({ ok: false });
    }
  });

  socket.on('room:leave', ({ roomId }) => {
    const { room, destroyed } = rooms.leaveRoom(roomId, socket.data.userId);
    socket.leave(`room:${roomId}`);
    activeRoomByUser.delete(socket.data.userId);
    if (destroyed && room) {
      io.to(`room:${roomId}`).emit('room:closed', { roomId, reason: 'no_active_players' });
      for (const p of room.players.values()) activeRoomByUser.delete(p.userId);
    } else if (room) {
      broadcastRoom(io, room);
    }
    broadcastRoomList(io);
  });

  // ── Lobby: ready ──
  socket.on('lobby:ready', ({ roomId, isReady }) => {
    try {
      const room = rooms.setReady(roomId, socket.data.userId, isReady);
      broadcastRoom(io, room);
    } catch (e) {
      err(socket, 'lobby:ready', e);
    }
  });

  // ── Lobby: update settings ──
  socket.on('lobby:update_settings', ({ roomId, patch }) => {
    try {
      const room = rooms.updateSettings(roomId, socket.data.userId, patch);
      broadcastRoom(io, room);
      broadcastRoomList(io);
    } catch (e) {
      err(socket, 'lobby:update_settings', e);
    }
  });

  // ── Lobby: set color (HEAD feature) ──
  // 🆕 Part 1 — color selection. Any active player can set their own color;
  // rejected if another non-abandoned player already holds it.
  socket.on('lobby:set_color', ({ roomId, colorId }: { roomId: string; colorId: ColorId }, cb) => {
    try {
      const room = rooms.setPlayerColor(roomId, socket.data.userId, colorId);
      cb?.({ ok: true });
      broadcastRoom(io, room);
    } catch (e) {
      err(socket, 'lobby:set_color', e);
      cb?.({ ok: false, error: e instanceof rooms.RoomError ? e.code : 'UNKNOWN' });
    }
  });

  // ── Lobby: kick ──
  socket.on('lobby:kick', ({ roomId, targetUserId }) => {
    try {
      const room = rooms.kickPlayer(roomId, socket.data.userId, targetUserId);
      io.to(`room:${roomId}`).emit('lobby:kicked', { targetUserId });
      activeRoomByUser.delete(targetUserId);
      broadcastRoom(io, room);
      broadcastRoomList(io);
    } catch (e) {
      err(socket, 'lobby:kick', e);
    }
  });

  // ── Lobby: transfer host ──
  socket.on('lobby:transfer_host', ({ roomId, targetUserId }) => {
    try {
      const room = rooms.transferHost(roomId, socket.data.userId, targetUserId);
      broadcastRoom(io, room);
    } catch (e) {
      err(socket, 'lobby:transfer_host', e);
    }
  });

  // ── Lobby: start race ──
  socket.on('lobby:start', ({ roomId }) => {
    try {
      const room = rooms.startRace(roomId, socket.data.userId);
      broadcastRoom(io, room);
      broadcastRoomList(io);
      setTimeout(() => {
        const r = roomStore.get(roomId);
        if (r) io.to(`room:${roomId}`).emit('race:words', { words: r.raceWords, startTimestamp: r.startTimestamp });
      }, 0);
    } catch (e) {
      err(socket, 'lobby:start', e);
    }
  });

  // ── Race: progress (HEAD: includes completedChars) ──
  // Throttled client-side to ~250-500ms — server does not re-throttle, it
  // trusts the client to behave, but ignores updates for rooms not racing.
  // 🆕 Part 2 — completedChars added, additive only; this handler stays a
  // pure relay for the broadcast half (confirmed no other logic changes
  // needed here — recordProgress is the only place the payload is consumed
  // server-side, purely for display, never for scoring).
  socket.on('race:progress', ({ roomId, wordIndex, completedChars, elapsedMs, wpm, rawWpm, accuracy }) => {
    rooms.recordProgress(roomId, socket.data.userId, { wordIndex, completedChars, elapsedMs, wpm, rawWpm, accuracy });
    const room = roomStore.get(roomId);
    if (room) {
      socket.to(`room:${roomId}`).emit('race:progress_broadcast', {
        userId: socket.data.userId,
        wordIndex,
        completedChars,
        elapsedMs,
        wpm,
        rawWpm,
        accuracy,
      });
    }
  });

  // ── Race: finish ──
  socket.on('race:finish', (submission: FinalSubmission & { roomId: string }, cb) => {
    try {
      const room = rooms.getRoomOrThrow(submission.roomId);
      const player = room.players.get(socket.data.userId);
      if (!player) throw new rooms.RoomError('NOT_IN_ROOM', 'Not in this room.');
      if (!room.startTimestamp) throw new rooms.RoomError('INVALID_STATE', 'Race has not started.');

      const serverElapsedMs = Date.now() - room.startTimestamp;
      const recomputed = recomputeFinalStats(submission, serverElapsedMs);

      player.finalStats = {
        wpm: recomputed.wpm,
        rawWpm: recomputed.rawWpm,
        accuracy: recomputed.accuracy,
        finishedAt: Date.now(),
        dnf: false,
        outlierFlag: recomputed.outlierFlag,
      };

      cb?.({ ok: true, stats: recomputed });
      broadcastRoom(io, room);

      if (rooms.finishRace(room)) {
        io.to(`room:${room.id}`).emit('race:results', rooms.toDTO(room));
      }
    } catch (e) {
      err(socket, 'race:finish', e);
      cb?.({ ok: false });
    }
  });

  // ── Return to lobby vote (HEAD feature) ──
  // 🆕 Part 5 — return-to-lobby vote toggle. Broadcasts room:updated as
  // usual; if the vote just completed the transition (status flips to
  // 'waiting' inside voteReturnToLobby), also re-broadcast the public room
  // list so the room reappears correctly in RoomBrowserPage.
  socket.on('room:return_to_lobby_vote', ({ roomId, optIn }: { roomId: string; optIn: boolean }, cb) => {
    try {
      const room = rooms.voteReturnToLobby(roomId, socket.data.userId, optIn);
      cb?.({ ok: true });
      broadcastRoom(io, room);
      if (room.status === 'waiting') broadcastRoomList(io);
    } catch (e) {
      err(socket, 'room:return_to_lobby_vote', e);
      cb?.({ ok: false, error: e instanceof rooms.RoomError ? e.code : 'UNKNOWN' });
    }
  });

  // ── Quick match ──
  socket.on('quickmatch:join', (settings) => {
    const entry: QueueEntry = { ...me(), settings, queuedAt: Date.now(), socketId: socket.id };
    quickMatchQueue.enqueue(entry);
    socket.emit('quickmatch:searching', { queuedAt: entry.queuedAt });
    tryMatch(io, entry.settings);

    setTimeout(() => {
      const stillQueued = quickMatchQueue.queuedFor(socket.data.userId) !== null;
      if (!stillQueued) return;
      const pair = quickMatchQueue.tryPopAnyPair(socket.data.userId);
      if (pair) {
        createMatchRoom(io, pair);
      } else {
        socket.emit('quickmatch:timeout_no_bot', {
          message: 'Still searching — no bot fallback wired up yet in this MVP.',
        });
      }
    }, 15000);
  });

  socket.on('quickmatch:cancel', () => {
    quickMatchQueue.remove(socket.data.userId);
    socket.emit('quickmatch:cancelled');
  });

  // ─── Room invites ──────────────────────────────────────────────────────
  socket.on('room:invite', ({ roomId, targetUserId }) => {
    try {
      const room = rooms.getRoomOrThrow(roomId);
      if (!room.players.has(socket.data.userId)) {
        throw new rooms.RoomError('NOT_IN_ROOM', 'You are not in this room.');
      }
      if (room.players.has(targetUserId)) {
        // Target already in the room – ignore
        return;
      }
      const targetSocketId = socketIdByUser.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('room:invited', {
          roomId,
          inviterUsername: socket.data.username,
          roomName: room.settings.name,
        });
      }
    } catch (e) {
      err(socket, 'room:invite', e);
    }
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    // Clean up socket mapping
    socketIdByUser.delete(socket.data.userId);
    console.log('[presence] user disconnected:', socket.data.userId);

    // ─── Presence: notify others this user went offline ──
    socket.broadcast.emit('user:disconnected', socket.data.userId);

    quickMatchQueue.remove(socket.data.userId);
    const roomId = activeRoomByUser.get(socket.data.userId);
    if (!roomId) return;

    const room = roomStore.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.data.userId);
    if (!player) return;

    if (room.status === 'racing' || room.status === 'countdown') {
      player.connection = 'disconnected';
      player.disconnectedAt = Date.now();
      broadcastRoom(io, room);
    } else {
      const { room: remaining, destroyed } = rooms.leaveRoom(roomId, socket.data.userId);
      activeRoomByUser.delete(socket.data.userId);
      if (destroyed && remaining) {
        io.to(`room:${roomId}`).emit('room:closed', { roomId, reason: 'no_active_players' });
        for (const p of remaining.players.values()) activeRoomByUser.delete(p.userId);
      } else if (remaining) {
        broadcastRoom(io, remaining);
        // 🆕 vote-completion-by-disconnect case
        if (remaining.status === 'waiting') broadcastRoomList(io);
      }
      broadcastRoomList(io);
    }
  });
}

// ─── Quick match helpers ────────────────────────────────────────────────

function tryMatch(io: Server, settings: QueueEntry['settings']) {
  const pair = quickMatchQueue.tryPopPair(settings);
  if (pair) createMatchRoom(io, pair);
}

function createMatchRoom(io: Server, [a, b]: [QueueEntry, QueueEntry]) {
  const room = rooms.createRoom(a, {
    name: `Quick Match`,
    mode: a.settings.mode,
    duration: 30,
    wordCount: 25,
    wordSet: a.settings.wordSet,
    punctuation: false,
    numbers: false,
    maxPlayers: 2,
    visibility: 'public',
  });
  rooms.joinRoom(room.id, b, undefined);

  for (const entry of [a, b]) {
    const s = io.sockets.sockets.get(entry.socketId);
    if (s) {
      s.join(`room:${room.id}`);
      activeRoomByUser.set(entry.userId, room.id);
      const roomPlayer = room.players.get(entry.userId);
      if (roomPlayer) roomPlayer.socketId = entry.socketId;
      s.emit('quickmatch:found', { room: rooms.toDTO(room) });
    }
  }

  setTimeout(() => {
    // Robust quick‑match start with fallback and error reporting (HEAD)
    try {
      const started = rooms.startRace(room.id, a.userId);
      io.to(`room:${room.id}`).emit('room:updated', rooms.toDTO(started));
    } catch (firstErr) {
      try {
        // both players not marked ready by default for quick-match; force it
        for (const p of room.players.values()) p.isReady = true;
        const started = rooms.startRace(room.id, a.userId);
        io.to(`room:${room.id}`).emit('room:updated', rooms.toDTO(started));
      } catch (secondErr) {
        console.error(`[quickmatch] failed to start race for room ${room.id}:`, secondErr);
        io.to(`room:${room.id}`).emit('error', {
          forEvent: 'quickmatch:start',
          code: secondErr instanceof rooms.RoomError ? secondErr.code : 'UNKNOWN',
          message: 'Could not start the quick match race. Please try again.',
        });
      }
    }
  }, 1500);
}