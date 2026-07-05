import type { Server } from 'socket.io';
import { sweepStaleRooms, expireDisconnectGrace } from './roomManager.js';
import { roomStore } from './roomStore.js';
import { toDTO, listPublicRooms } from './roomManager.js';
import { config } from '../config.js';

export function startCleanupSweep(io: Server) {
  setInterval(() => {
    const expired = expireDisconnectGrace();
    for (const { roomId } of expired) {
      const room = roomStore.get(roomId);
      if (room) io.to(`room:${roomId}`).emit('room:updated', toDTO(room));
    }

    const destroyedIds = sweepStaleRooms();
    if (destroyedIds.length) {
      for (const id of destroyedIds) {
        io.to(`room:${id}`).emit('room:closed', { roomId: id, reason: 'idle_timeout' });
      }
      io.emit('room:list_updated', listPublicRooms());
    }
  }, config.cleanupSweepIntervalMs);
}
