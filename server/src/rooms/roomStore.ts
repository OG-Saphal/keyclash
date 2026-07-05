import type { RoomState } from './types.js';

/**
 * MVP storage: a plain in-memory Map, one process.
 *
 * Tradeoff (flagged per spec 3.2, please confirm before deploying):
 * - In-memory (this file): simplest possible thing that works. Zero extra
 *   infra. Downsides: (a) a server restart/deploy wipes every live room and
 *   drops everyone's race mid-game, (b) it cannot horizontally scale — you
 *   are pinned to exactly one Node process, so all connected players must
 *   hit that same instance (fine on a single Render/Fly/Railway box, breaks
 *   the moment you need 2+ instances behind a load balancer).
 * - Redis (e.g. Upstash): survives restarts, enables horizontal scaling and
 *   sticky-session-free deploys, but adds a network hop per room mutation
 *   and a new piece of infra to provision/monitor.
 *
 * Recommendation: ship with in-memory for MVP (this is what's implemented
 * below) since a typing-race app's rooms are short-lived (minutes) and
 * restart-losing an in-progress race, while annoying, isn't catastrophic.
 * Move to Redis only once you actually need >1 server instance or restarts
 * during peak hours become a real complaint. The RoomStore interface below
 * is deliberately narrow so swapping the implementation later is a
 * single-file change, not a rewrite.
 */
export interface RoomStore {
  get(roomId: string): RoomState | undefined;
  set(roomId: string, room: RoomState): void;
  delete(roomId: string): void;
  all(): RoomState[];
}

class InMemoryRoomStore implements RoomStore {
  private rooms = new Map<string, RoomState>();

  get(roomId: string) {
    return this.rooms.get(roomId.toUpperCase());
  }
  set(roomId: string, room: RoomState) {
    this.rooms.set(roomId.toUpperCase(), room);
  }
  delete(roomId: string) {
    this.rooms.delete(roomId.toUpperCase());
  }
  all() {
    return [...this.rooms.values()];
  }
}

export const roomStore: RoomStore = new InMemoryRoomStore();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 — avoids ambiguous codes

export function generateRoomCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (roomStore.get(code));
  return code;
}
