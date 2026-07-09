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