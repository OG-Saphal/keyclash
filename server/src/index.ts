import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { verifySupabaseToken } from './auth/verifySupabaseToken.js';
import { registerRoomHandlers } from './socket/handlers.js';
import { startCleanupSweep } from './rooms/cleanupSweep.js';

const app = express();
app.use(cors({ origin: config.corsOrigins }));
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.corsOrigins },
});

// ── Auth bridge: every socket connection must present a valid Supabase
// access token in the handshake `auth` payload. Guests are rejected outright
// here, matching the spec ("guests cannot open multiplayer at all").
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  const identity = await verifySupabaseToken(token);
  if (!identity) {
    next(new Error('UNAUTHORIZED'));
    return;
  }

  const username = (socket.handshake.auth?.username as string) ?? identity.email ?? 'Player';
  const avatarUrl = (socket.handshake.auth?.avatarUrl as string | null) ?? null;

  // Every event this socket ever emits is attributed to identity.userId from
  // here on — never to socket.id, since socket IDs churn across reconnects.
  (socket.data as any).userId = identity.userId;
  (socket.data as any).username = username;
  (socket.data as any).avatarUrl = avatarUrl;
  next();
});

io.on('connection', (socket) => {
  registerRoomHandlers(io, socket as any);
});

startCleanupSweep(io);

httpServer.listen(config.port, () => {
  console.log(`[keyclash-server] listening on :${config.port}`);
});
