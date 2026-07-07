import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PlayerAvatar from './PlayerAvatar';
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
}

const PLACEMENT_LABEL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };

/**
 * 🆕 Part 5 — full leaderboard overhaul. Replaces the old compact
 * "Standings" panel (name + wpm only, re-sorted every render purely by live
 * progress) that used to live inline in RacePage.tsx. Now shows avatar +
 * name + live wpm/accuracy per player, and — the actual point of this task
 * item — tags each row with its placement (1st, 2nd, ...) the MOMENT that
 * player finishes, not just once every player has.
 *
 * Ranking rule:
 *  - Everyone who has FINISHED (finalStats present, not a DNF/abandon) is
 *    ranked first, ordered by when they actually finished (finalStats.
 *    finishedAt, ascending) — this is the server-authoritative moment
 *    (see server/src/socket/handlers.ts race:finish handler) and never
 *    reshuffles once assigned, since finishedAt never changes after the
 *    fact.
 *  - Everyone still racing is listed below, live-sorted by progress
 *    (word index, then wpm) same as before, but deliberately WITHOUT a
 *    placement badge — their final rank isn't decided until they finish.
 *
 * This component only reads/renders. It does not decide navigation —
 * RacePage.tsx's own "local player finished -> submit + navigate" effect is
 * completely untouched by this UI change, so the "only navigate to results
 * once every active player has finished" behavior mentioned in the spec
 * is unaffected either way.
 */
const RaceLeaderboard: React.FC<Props> = ({
  players, currentUserId, localWordIndex, localWpm, localAccuracy, otherPlayersProgress,
}) => {
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
    <div className="w-full md:w-56 bg-bg-secondary border border-border rounded-xl p-2 flex flex-col gap-1 h-fit">
      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide px-1 pb-1">
        Standings
      </span>
      <AnimatePresence initial={false}>
        {finished.map((p, i) => {
          const placement = i + 1;
          const isSelf = p.userId === currentUserId;
          return (
            <motion.div
              key={p.userId}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-xs px-1 py-1 rounded bg-bg-tertiary/40"
            >
              <span className="w-8 font-mono font-semibold text-accent shrink-0">
                {PLACEMENT_LABEL[placement] ?? `${placement}th`}
              </span>
              <PlayerAvatar username={p.username} avatarUrl={p.avatarUrl} size={20} ring={isSelf} />
              <span className={`flex-1 truncate ${isSelf ? 'font-semibold text-accent' : ''}`}>
                {p.username}{isSelf ? ' (you)' : ''}
              </span>
              <span className="text-text-muted shrink-0">{p.finalStats!.wpm} wpm</span>
            </motion.div>
          );
        })}
        {racing.map(({ player: p, wpm, accuracy }) => {
          const isSelf = p.userId === currentUserId;
          return (
            <motion.div
              key={p.userId}
              layout
              className="flex items-center gap-2 text-xs px-1 py-1 rounded"
            >
              <span className="w-8 shrink-0" />
              <PlayerAvatar username={p.username} avatarUrl={p.avatarUrl} size={20} ring={isSelf} />
              <span className={`flex-1 truncate ${isSelf ? 'font-semibold text-accent' : 'text-text-muted'}`}>
                {p.username}{isSelf ? ' (you)' : ''}
                {p.connection === 'disconnected' && <span className="ml-1 text-status-warning">⏳</span>}
              </span>
              <span className="text-text-muted shrink-0">
                {p.connection === 'disconnected' ? 'reconnecting…' : `${wpm} wpm · ${accuracy}%`}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default RaceLeaderboard;
