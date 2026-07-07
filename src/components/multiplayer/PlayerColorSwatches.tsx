import React from 'react';
import { COLOR_IDS, resolvePlayerColor, type ColorId } from '../../data/playerColors';
import { useThemeStore } from '../../store/useThemeStore';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import type { RoomPlayerDTO } from '../../types/multiplayer';

interface Props {
  players: RoomPlayerDTO[]; // active players in the room, to know what's taken
  myColorId: ColorId;
}

/**
 * 🆕 Part 1 — interactive swatch picker. Only ever rendered on the LOCAL
 * player's own row in LobbyPage (you can't set someone else's color — other
 * rows just show a static colored dot). Swatches already held by another
 * currently-active (non-abandoned) player render disabled/greyed with a
 * tooltip naming who has it.
 */
const PlayerColorSwatches: React.FC<Props> = ({ players, myColorId }) => {
  const theme = useThemeStore((s) => s.theme);
  const setColor = useMultiplayerStore((s) => s.setColor);

  const takenBy = new Map(
    players.filter((p) => p.connection !== 'abandoned').map((p) => [p.colorId, p.username])
  );

  return (
    <div className="flex gap-1.5" role="group" aria-label="Choose your cursor color">
      {COLOR_IDS.map((colorId) => {
        const takenUsername = takenBy.get(colorId);
        const isMine = colorId === myColorId;
        const isTaken = !!takenUsername && !isMine;
        return (
          <button
            key={colorId}
            type="button"
            disabled={isTaken}
            title={isTaken ? `Taken by ${takenUsername}` : colorId}
            aria-label={colorId}
            onClick={() => setColor(colorId)}
            className={[
              'w-5 h-5 rounded-full transition-transform',
              isMine ? 'ring-2 ring-offset-2 ring-offset-bg-secondary ring-text-primary scale-110' : '',
              isTaken ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-110',
            ].join(' ')}
            style={{ background: resolvePlayerColor(colorId, theme) }}
          />
        );
      })}
    </div>
  );
};

export default PlayerColorSwatches;
