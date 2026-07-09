import React from 'react';
import { Eye } from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';
import type { RoomPlayerDTO } from '../../types/multiplayer';

interface Props {
  spectators: RoomPlayerDTO[];
  /**
   * 'panel' — a boxed, titled list (used on the Results page, where there's
   * vertical room for a proper section).
   * 'inline' — a compact overlapping-avatar strip (used in the Lobby footer
   * and on the Race page, where space is tighter and the list shouldn't
   * compete with the player list / race track for attention).
   */
  variant?: 'panel' | 'inline';
}

/**
 * ✨ Feature — visible, real-time spectator list (profiles + usernames).
 * Pure presentation: `spectators` is just the `isSpectator` slice of the
 * SAME `room.players` array every other multiplayer page already reads from
 * `useMultiplayerStore().currentRoom` — spectators joining/leaving update
 * this component the instant the existing `room:updated` broadcast lands,
 * with no new store state, socket events, or server changes needed.
 */
const SpectatorsList: React.FC<Props> = ({ spectators, variant = 'panel' }) => {
  if (spectators.length === 0) return null;

  if (variant === 'inline') {
    const shown = spectators.slice(0, 6);
    const overflow = spectators.length - shown.length;
    return (
      <div className="flex items-center gap-2 flex-wrap justify-center text-xs text-text-muted" title={spectators.map((s) => s.username).join(', ')}>
        <Eye className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium">
          {spectators.length} spectator{spectators.length > 1 ? 's' : ''} watching
        </span>
        <div className="flex -space-x-2 shrink-0">
          {shown.map((s) => (
            <PlayerAvatar key={s.userId} username={s.username} avatarUrl={s.avatarUrl} size={20} />
          ))}
          {overflow > 0 && (
            <span className="w-5 h-5 rounded-full bg-bg-primary/80 border border-bg-secondary flex items-center justify-center text-[10px] text-text-muted">
              +{overflow}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 flex items-center gap-2 text-sm font-semibold text-text-muted">
        <Eye className="w-4 h-4" /> Spectators ({spectators.length})
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
        {spectators.map((s) => (
          <div key={s.userId} className="flex items-center gap-3 px-4 py-2.5">
            <PlayerAvatar username={s.username} avatarUrl={s.avatarUrl} size={28} />
            <span className="text-sm truncate">{s.username}</span>
            {s.connection === 'disconnected' && (
              <span className="text-xs text-text-muted ml-auto shrink-0">reconnecting…</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpectatorsList;
