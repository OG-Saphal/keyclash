import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTypingStore } from '../store/useTypingStore';
import { formatTime } from '../utils/typing';

/**
 * Timer — the anchor stat of the "digital dashboard" HUD. Redesigned from
 * plain oversized text into a glass stat cell so it reads as part of the
 * same instrument cluster as LiveStats, with the countdown itself getting
 * the most visual weight (largest type, only stat with a glow).
 * Behavior (urgency threshold, keyed re-mount per second) is unchanged.
 */
const Timer: React.FC = () => {
  const timeLeft = useTypingStore(s => s.timeLeft);
  const phase = useTypingStore(s => s.phase);

  const isUrgent = timeLeft <= 10 && phase === 'running';
  const isIdle = phase === 'idle';

  return (
    <div className="flex flex-col items-center px-5 py-2.5 rounded-xl bg-white/5 backdrop-blur-sm">
      <span className="text-text-muted text-[0.65rem] font-sans font-semibold uppercase tracking-[0.2em] mb-0.5">
        time
      </span>
      <AnimatePresence mode="wait">
        <motion.div
          key={timeLeft}
          initial={{ opacity: 0.5, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className={[
            'font-mono font-bold tabular-nums select-none text-4xl leading-none transition-colors duration-300',
            isUrgent ? 'text-status-error' : isIdle ? 'text-text-muted' : 'text-accent-primary',
          ].join(' ')}
          style={isUrgent ? { textShadow: '0 0 20px rgb(var(--status-error) / 0.5)' } : { textShadow: '0 0 20px rgb(var(--accent-primary) / 0.35)' }}
        >
          {formatTime(timeLeft)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Timer;
