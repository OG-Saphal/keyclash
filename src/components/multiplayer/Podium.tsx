import React from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';
import { resolvePlayerColor } from '../../data/playerColors';
import type { RoomPlayerDTO } from '../../types/multiplayer';

interface Props {
  /** Up to 3 entries, already sorted 1st -> 3rd (may contain fewer than 3). */
  podium: RoomPlayerDTO[];
  theme: 'light' | 'dark';
  currentUserId: string;
  personalBest: number | null;
}

const TIER = [
  { place: 1, height: 'h-40', order: 'order-2', shadow: 'shadow-podium-gold', ring: 'border-podium-gold/50', fill: 'bg-podium-gold/10', label: 'text-podium-gold' },
  { place: 2, height: 'h-28', order: 'order-1', shadow: 'shadow-podium-silver', ring: 'border-podium-silver/40', fill: 'bg-podium-silver/5', label: 'text-podium-silver' },
  { place: 3, height: 'h-20', order: 'order-3', shadow: 'shadow-podium-bronze', ring: 'border-podium-bronze/40', fill: 'bg-podium-bronze/5', label: 'text-podium-bronze' },
] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const card = {
  hidden: { opacity: 0, y: 30, scale: 0.92 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1.2, 0.36, 1] } },
};

/**
 * 🆕 The visual hero of the results page. Replaces the old three
 * same-height tiles with a tiered "winner's stage": 1st place is visibly
 * larger, gold-rimmed and glowing, with a crown; 2nd/3rd sit lower and
 * quieter beside it. `order-*` handles the classic 2nd/1st/3rd podium
 * arrangement regardless of array order.
 */
const Podium: React.FC<Props> = ({ podium, theme, currentUserId, personalBest }) => {
  if (podium.length === 0) return null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex items-end justify-center gap-3 md:gap-5 [perspective:1000px]"
    >
      {TIER.slice(0, podium.length === 1 ? 1 : podium.length).map((tier) => {
        const p = podium[tier.place - 1];
        if (!p) return <div key={tier.place} className={tier.order} />;
        const isSelf = p.userId === currentUserId;
        const isFirst = tier.place === 1;
        const delta = isSelf && personalBest !== null && p.finalStats && !p.finalStats.dnf
          ? p.finalStats.wpm - personalBest
          : null;

        return (
          <motion.div
            key={p.userId}
            variants={card}
            className={`flex flex-col items-center ${tier.order} ${isFirst ? 'scale-105' : ''}`}
            style={{ transform: isFirst ? undefined : 'rotateX(2deg)' }}
          >
            {isFirst && (
              <Crown className="w-7 h-7 text-podium-gold mb-1 drop-shadow-[0_0_10px_rgba(255,210,77,0.6)]" />
            )}
            <PlayerAvatar username={p.username} avatarUrl={p.avatarUrl} size={isFirst ? 56 : 44} ring={isSelf} />
            <span className={`mt-2 text-sm font-semibold truncate max-w-[7rem] ${isSelf ? 'text-accent-primary' : 'text-text-primary'}`}>
              {p.username}{isSelf ? ' (you)' : ''}
            </span>
            <span
              className="w-2 h-2 rounded-full mt-1"
              style={{ background: resolvePlayerColor(p.colorId, theme) }}
            />
            {delta !== null && (
              <span className={`text-[0.65rem] mt-1 ${delta >= 0 ? 'text-status-success' : 'text-text-muted'}`}>
                {delta >= 0 ? `+${delta} pb` : `${delta} vs pb`}
              </span>
            )}

            <div
              className={[
                'mt-3 w-24 md:w-28 rounded-t-xl border border-b-0 backdrop-blur-sm flex flex-col items-center justify-start pt-3 gap-0.5',
                tier.height, tier.shadow, tier.ring, tier.fill,
              ].join(' ')}
            >
              <span className={`text-[0.6rem] font-sans font-bold uppercase tracking-widest ${tier.label}`}>
                {tier.place === 1 ? '1st' : tier.place === 2 ? '2nd' : '3rd'}
              </span>
              <span className="font-mono font-black text-2xl text-text-primary leading-none">
                {p.finalStats?.wpm ?? 0}
              </span>
              <span className="text-[0.6rem] text-text-muted">wpm</span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default Podium;
