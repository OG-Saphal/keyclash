const voiceRooms = new Map<string, Set<string>>();

export function addUserToVoiceRoom(roomId: string, userId: string) {
    if (!voiceRooms.has(roomId)) {
        voiceRooms.set(roomId, new Set());
    }
    voiceRooms.get(roomId)!.add(userId);
}

export function removeUserFromVoiceRoom(roomId: string, userId: string) {
    const room = voiceRooms.get(roomId);
    if (room) {
        room.delete(userId);
        if (room.size === 0) {
            voiceRooms.delete(roomId);
        }
    }
}

export function getVoiceUsers(roomId: string): string[] {
    return Array.from(voiceRooms.get(roomId) || []);
}

export function removeUserFromAllVoiceRooms(userId: string): string[] {
    const affected: string[] = [];
    for (const [roomId, users] of voiceRooms.entries()) {
        if (users.delete(userId)) {
            affected.push(roomId);
            if (users.size === 0) voiceRooms.delete(roomId);
        }
    }
    return affected;
}

export function findUserRoom(userId: string): string | undefined {
    for (const [roomId, users] of voiceRooms.entries()) {
        if (users.has(userId)) return roomId;
    }
    return undefined;
}

/**
 * 🆕 FIX (voice-roster desync): removes every user from a single voice room
 * and deletes the room entry entirely. Used by roomManager.ts when the
 * corresponding GAME room is destroyed (all active players left/kicked, or
 * it was reaped by the idle sweep) — any lingering voice-room membership
 * (e.g. spectators who never explicitly left voice) would otherwise become
 * a permanent "ghost" roster with no game room behind it, since nothing else
 * ever cleans up by roomId alone (existing cleanup is keyed by userId only,
 * via removeUserFromVoiceRoom/removeUserFromAllVoiceRooms).
 * Returns the userIds that were in the room, so a caller with access to the
 * Socket.IO server (e.g. socket/handlers.ts) can optionally notify them.
 */
export function clearVoiceRoom(roomId: string): string[] {
    const room = voiceRooms.get(roomId);
    if (!room) return [];
    const affectedUsers = Array.from(room);
    voiceRooms.delete(roomId);
    return affectedUsers;
}