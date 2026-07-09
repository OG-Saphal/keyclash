import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag } from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';
import { resolvePlayerColor } from '../../data/playerColors';
import { useThemeStore } from '../../store/useThemeStore';
import type { RoomPlayerDTO } from '../../types/multiplayer';

interface OtherProgress {
  wordIndex: number;
  wpm: number;
  accuracy: number;
}

interface Props {
  players: RoomPlayerDTO[]; // active players only
  currentUserId: string;
  localWordIndex: number;
  localWpm: number;
  localAccuracy: number;
  otherPlayersProgress: Record<string, OtherProgress>;
  /** Total words in the race text — drives each lane's fill %. Same value
   *  every client already has via useMultiplayerStore().raceWords.length. */
  totalWords: number;
  /** Overtake indicator per userId, computed by RacePage (unchanged logic —
   *  this component only reads it, same as the old PlayerProgressBar did). */
  rankDeltas?: Record<string, -1 | 0 | 1>;
}

const PLACEMENT_LABEL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };

const RaceLeaderboard: React.FC<Props> = ({
  players, currentUserId, localWordIndex, localWpm, localAccuracy, otherPlayersProgress, totalWords, rankDeltas = {},
}) => {
  const theme = useThemeStore((s) => s.theme);

  const { finished, racing } = useMemo(() => {
    const finishedPlayers = players
      .filter((p) => p.finalStats && !p.finalStats.dnf)
      .sort((a, b) => (a.finalStats!.finishedAt ?? 0) - (b.finalStats!.finishedAt ?? 0));
    const racingPlayers = players
      .filter((p) => !p.finalStats)
      .map((p) => {
        const isSelf = p.userId === currentUserId;
        const live = isSelf
          ? { wordIndex: localWordIndex, wpm: localWpm, accuracy: localAccuracy }
          : otherPlayersProgress[p.userId];
        return { player: p, wordIndex: live?.wordIndex ?? 0, wpm: live?.wpm ?? 0, accuracy: live?.accuracy ?? 100 };
      })
      .sort((a, b) => b.wordIndex - a.wordIndex || b.wpm - a.wpm);
    return { finished: finishedPlayers, racing: racingPlayers };
  }, [players, currentUserId, localWordIndex, localWpm, localAccuracy, otherPlayersProgress]);

  return (
    <div className="w-full md:w-72 shrink-0 bg-white/5 backdrop-blur-sm border border-border rounded-2xl p-2.5 flex flex-col gap-1.5 h-fit">
      <span className="text-[0.65rem] font-sans font-semibold text-text-muted uppercase tracking-[0.2em] px-1.5 pb-0.5">
        Live standings
      </span>

      <AnimatePresence initial={false}>
        {/* Finished — static placement rows */}
        {finished.map((p, i) => {
          const placement = i + 1;
          const isSelf = p.userId === currentUserId;
          return (
            <motion.div
              key={p.userId}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={[
                'flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg',
                placement === 1 ? 'bg-podium-gold/10 border border-podium-gold/30' : 'bg-bg-tertiary/40',
              ].join(' ')}
            >
              <span className={`w-7 font-mono font-bold shrink-0 ${placement === 1 ? 'text-podium-gold' : 'text-accent-primary'}`}>
                {PLACEMENT_LABEL[placement] ?? `${placement}th`}
              </span>
              <PlayerAvatar username={p.username} avatarUrl={p.avatarUrl} size={20} ring={isSelf} />
              <span className={`flex-1 truncate ${isSelf ? 'font-semibold text-accent-primary' : ''}`}>
                {p.username}{isSelf ? ' (you)' : ''}
              </span>
              <Flag className="w-3 h-3 text-text-muted shrink-0" />
              <span className="text-text-muted font-mono shrink-0 flex items-center gap-2">
                {p.finalStats!.wpm} wpm · {p.finalStats!.accuracy}%
              </span>
            </motion.div>
          );
        })}

        {/* Still racing — live lanes */}
        {racing.map(({ player: p, wordIndex, wpm, accuracy }, i) => {
          const isSelf = p.userId === currentUserId;
          const color = resolvePlayerColor(p.colorId, theme);
          const pct = totalWords > 0 ? Math.min(100, (wordIndex / totalWords) * 100) : 0;
          const isLeading = i === 0 && wordIndex > 0;
          const delta = rankDeltas[p.userId] ?? 0;
          const disconnected = p.connection === 'disconnected';

          return (
            <motion.div
              key={p.userId}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-1 px-1.5 py-1"
            >
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`truncate ${isSelf ? 'font-semibold text-accent-primary' : 'text-text-muted'}`}>
                  {p.username}{isSelf ? ' (you)' : ''}
                </span>
                {delta === 1 && <span className="text-status-success text-[0.65rem]">▲</span>}
                {delta === -1 && <span className="text-status-error text-[0.65rem]">▼</span>}
                <span className="ml-auto text-text-muted font-mono shrink-0 flex items-center gap-2">
                  {disconnected ? 'reconnecting…' : `${wpm} wpm · ${accuracy}%`}
                </span>
              </div>

              {/* Lane / track */}
              <div
                className={[
                  'relative h-6 rounded-full bg-track bg-lane-dashes overflow-hidden border border-white/5',
                  isLeading ? 'shadow-lane-lead' : '',
                ].join(' ')}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full opacity-20 transition-[width] duration-300"
                  style={{ width: `${pct}%`, background: !disconnected ? color : undefined }}
                />
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2"
                  animate={{ left: `calc(${pct}% - 9px)` }}                  
                  transition={{ duration: 0.05, ease: 'linear' }}
                >
                  <PlayerAvatar username={p.username} avatarUrl={p.avatarUrl} size={18} ring={isSelf} />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default RaceLeaderboard;