import React from 'react';
import { motion } from 'framer-motion';
import PlayerAvatar from './PlayerAvatar';
import { resolvePlayerColor, type ColorId } from '../../data/playerColors';
import { useThemeStore } from '../../store/useThemeStore';

interface Props {
  username: string;
  avatarUrl: string | null;
  colorId: ColorId; // 🆕 Part 1/3 — reuses the player's assigned color for the track/avatar ring
  isSelf: boolean;
  wordIndex: number;
  totalWords: number;
  wpm: number;
  connection: 'connected' | 'disconnected' | 'abandoned';
  rankDelta?: -1 | 0 | 1; // 🆕 Part 3 — overtake indicator, computed by the caller (RacePage)
}

/**
 * 🆕 Part 3.1 — upgraded from a plain fill bar to a race-track style bar:
 * the player's avatar slides along the track proportional to completion %,
 * animated with Framer Motion rather than a CSS width transition.
 */
const PlayerProgressBar: React.FC<Props> = ({
  username, avatarUrl, colorId, isSelf, wordIndex, totalWords, wpm, connection, rankDelta = 0,
}) => {
  const theme = useThemeStore((s) => s.theme);
  const color = resolvePlayerColor(colorId, theme);
  const pct = totalWords > 0 ? Math.min(100, (wordIndex / totalWords) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={`w-20 truncate ${isSelf ? 'font-semibold text-accent' : 'text-text-muted'}`}>
        {username}{isSelf ? ' (you)' : ''}
        {rankDelta === 1 && <span className="ml-1 text-status-success">▲</span>}
        {rankDelta === -1 && <span className="ml-1 text-status-error">▼</span>}
      </span>
      <div className="flex-1 h-4 rounded-full bg-bg-secondary overflow-hidden relative">
        <div
          className="h-full rounded-full opacity-25 transition-[width] duration-300"
          style={{ width: `${pct}%`, background: connection === 'connected' ? color : undefined }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          animate={{ left: `calc(${pct}% - 10px)` }}
          // 🐛 FIX (Parts 2/9) — was `{ type: 'tween', duration: 0.3, ease:
          // 'easeOut' }`, a smooth 300ms glide. Per spec, avatar movement
          // should read as an instant "typewriter key-strike" snap on each
          // keystroke/progress update, not a tween. A very short linear
          // duration is kept (rather than 0) purely so React doesn't visibly
          // "pop" mid-frame on rapid re-renders — it's imperceptible as an
          // animation, which is the point.
          transition={{ duration: 0.05, ease: 'linear' }}
        >
          <PlayerAvatar username={username} avatarUrl={avatarUrl} size={20} ring={isSelf} />
        </motion.div>
      </div>
      <span className="w-16 text-right text-text-muted">
        {connection === 'disconnected' ? 'reconnecting…' : connection === 'abandoned' ? 'left' : `${wpm} wpm`}
      </span>
    </div>
  );
};

export default PlayerProgressBar;
