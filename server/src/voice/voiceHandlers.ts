import { Server, Socket } from 'socket.io';
import {
    addUserToVoiceRoom,
    removeUserFromVoiceRoom,
    getVoiceUsers,
    removeUserFromAllVoiceRooms,
    findUserRoom,
} from './voiceManager.js';
import type { VoiceSignalPayload, VoiceMuteStatePayload } from './types.js';

export function registerVoiceHandlers(io: Server, socket: Socket) {
    console.log(`[voice] registering handlers for socket ${socket.id}`);

    // Send an event to every voice participant in a room except the sender.
    const broadcastToVoiceRoom = (roomId: string, senderUserId: string, event: string, payload: any) => {
        const users = getVoiceUsers(roomId);
        users.forEach(userId => {
            if (userId !== senderUserId) {
                io.to(`user:${userId}`).emit(event, payload);
            }
        });
    };

    socket.on('voice:join', (data: { userId: string; roomId: string }, callback?: (roster: string[]) => void) => {
        const { userId, roomId } = data;
        console.log(`[voice] join request from ${userId}, room=${roomId}`);
        if (!roomId) {
            callback?.([]);
            return;
        }

        // Fix for RCA §3.5 — `disconnect` reads socket.data.userId to know who
        // to clean up, but nothing in this file ever assigned it. Whether it
        // was set depended entirely on code outside this file (presumably a
        // connection-level auth middleware), and if that assignment ever
        // raced with or preceded a bad disconnect, removeUserFromAllVoiceRooms
        // was silently skipped, leaving a "ghost" entry in the room's roster
        // forever. Every later joiner would then try to connect to that
        // ghost, sending an offer to a room with no listening socket.
        //
        // Setting it explicitly here — at the point voice identity is
        // actually established for this socket — guarantees disconnect
        // cleanup always has what it needs, independent of upstream wiring.
        socket.data.userId = userId;

        addUserToVoiceRoom(roomId, userId);
        const roster = getVoiceUsers(roomId);
        console.log(`[voice] roster after join:`, roster);
        callback?.(roster);

        // Tell others in the room about the new peer.
        broadcastToVoiceRoom(roomId, userId, 'voice:peer-joined', userId);

        // Send the updated roster to all participants (including the new one).
        const rosterPayload = { users: roster };
        roster.forEach(uid => {
            io.to(`user:${uid}`).emit('voice:roster', rosterPayload);
        });
    });

    socket.on('voice:leave', (userId: string) => {
        console.log(`[voice] leave from ${userId}`);
        handleVoiceLeave(io, socket, userId);
    });

    socket.on('voice:signal', (payload: VoiceSignalPayload) => {
        console.log(`[voice] signal from ${socket.data.userId} to ${payload.targetUserId} type=${payload.type}`);
        io.to(`user:${payload.targetUserId}`).emit('voice:signal', {
            ...payload,
            fromUserId: socket.data.userId,
        });
    });

    socket.on('voice:mute-state', (payload: VoiceMuteStatePayload) => {
        const userId = payload.userId;
        const roomId = findUserRoom(userId);
        if (roomId) {
            broadcastToVoiceRoom(roomId, userId, 'voice:mute-state', payload);
        }
    });

    socket.on('disconnect', () => {
        const userId = socket.data.userId;
        console.log(`[voice] disconnect for user ${userId}`);
        if (!userId) return;

        const affectedRooms = removeUserFromAllVoiceRooms(userId);
        affectedRooms.forEach(roomId => {
            broadcastToVoiceRoom(roomId, userId, 'voice:peer-left', userId);
            const roster = getVoiceUsers(roomId);
            roster.forEach(uid => {
                io.to(`user:${uid}`).emit('voice:roster', { users: roster });
            });
        });
    });

    function handleVoiceLeave(io: Server, socket: Socket, userId: string) {
        const roomId = findUserRoom(userId);
        if (!roomId) return;
        removeUserFromVoiceRoom(roomId, userId);
        broadcastToVoiceRoom(roomId, userId, 'voice:peer-left', userId);
        const roster = getVoiceUsers(roomId);
        roster.forEach(uid => {
            io.to(`user:${uid}`).emit('voice:roster', { users: roster });
        });
    }
}
