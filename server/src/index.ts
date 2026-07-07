import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { verifySupabaseToken } from './auth/verifySupabaseToken.js';
import { registerRoomHandlers, socketIdByUser } from './socket/handlers.js';
import { startCleanupSweep } from './rooms/cleanupSweep.js';

const app = express();
app.use(cors({ origin: config.corsOrigins }));
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.corsOrigins },
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  const identity = await verifySupabaseToken(token);
  if (!identity) {
    next(new Error('UNAUTHORIZED'));
    return;
  }

  const username = (socket.handshake.auth?.username as string) ?? identity.email ?? 'Player';
  const avatarUrl = (socket.handshake.auth?.avatarUrl as string | null) ?? null;

  (socket.data as any).userId = identity.userId;
  (socket.data as any).username = username;
  (socket.data as any).avatarUrl = avatarUrl;
  next();
});

io.on('connection', (socket) => {
  // Store socket ID for invites & presence
  socketIdByUser.set(socket.data.userId, socket.id);

  // ─── Presence: broadcast online status ──
  // 1. Send the full online list to the newly connected user
  const onlineUserIds = Array.from(socketIdByUser.keys());
  console.log('[presence] online users:', onlineUserIds);
  socket.emit('presence:update', { onlineUsers: onlineUserIds });

  // 2. Notify everyone else that this user is online
  socket.broadcast.emit('user:connected', socket.data.userId);

  // Register all room handlers
  registerRoomHandlers(io, socket as any);
});

startCleanupSweep(io);

httpServer.listen(config.port, () => {
  console.log(`[keyclash-server] listening on :${config.port}`);
});