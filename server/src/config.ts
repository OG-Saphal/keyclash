import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    // Fail loudly at boot rather than limping along with a broken auth bridge.
    throw new Error(`[keyclash-server] Missing required env var: ${name}`);
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  reconnectGraceMs: Number(process.env.RECONNECT_GRACE_MS ?? 25000),
  cleanupSweepIntervalMs: Number(process.env.CLEANUP_SWEEP_INTERVAL_MS ?? 60000),
  idleRoomTimeoutMs: Number(process.env.IDLE_ROOM_TIMEOUT_MS ?? 20 * 60 * 1000),
};
