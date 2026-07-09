import React from 'react';
import { useConnectionStore } from '../../store/useConnectionStore';
import { forceReconnect } from '../../services/multiplayer.service';

/**
 * Mount once at the App root (next to LeaveRoomConfirmModal / FriendsSidebar).
 * Renders nothing while connected. While reconnecting, shows a subtle status
 * line; once the retry budget is exhausted (reconnect_failed), shows a clear
 * "connection lost" banner with a manual retry button, rather than the
 * previous behavior of failing silently for the rest of the session.
 */
const ConnectionStatusBanner: React.FC = () => {
  const status = useConnectionStore((s) => s.status);
  const reconnectAttempt = useConnectionStore((s) => s.reconnectAttempt);

  if (status === 'connected' || status === 'disconnected') return null;

  const isFailed = status === 'failed';

  return (
    <div
      role="status"
      className={`fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium text-white
        ${isFailed ? 'bg-red-600' : 'bg-amber-500'}`}
    >
      {isFailed ? (
        <>
          <span>Connection lost. Multiplayer and voice chat are unavailable.</span>
          <button
            onClick={() => {
              forceReconnect().catch(() => {
                /* status store already reflects failure via listeners */
              });
            }}
            className="rounded bg-white/20 px-3 py-1 hover:bg-white/30 transition-colors"
          >
            Retry
          </button>
        </>
      ) : (
        <span>Reconnecting{reconnectAttempt ? ` (attempt ${reconnectAttempt})` : ''}…</span>
      )}
    </div>
  );
};

export default ConnectionStatusBanner;
