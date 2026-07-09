import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  /** Seconds remaining, or null/0 once the countdown has finished. */
  countdown: number | null;
  /** True for the brief window after countdown hits zero. */
  showGo: boolean;
}

/**
 * 🆕 Part 3.4 redesign — the countdown/GO moment used to be plain
 * centered text sharing space with the race UI underneath it. It's now a
 * full-viewport takeover (like a racing game's start sequence): a radial
 * glow burst behind the numeral, and the numeral itself "stomps" into
 * place via the `animate-stomp` keyframes instead of a simple scale/fade.
 *
 * Pure presentation — RacePage.tsx still owns all the actual timing logic
 * (raceStartTimestamp polling, startTest(), beginProgressReporting()).
 * This component only renders whatever state it's handed.
 */
const CountdownOverlay: React.FC<Props> = ({ countdown, showGo }) => {
  const showCountdown = countdown !== null && countdown > 0;
  if (!showCountdown && !showGo) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/70 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Ambient burst behind the numeral — brighter and tighter on GO */}
        <div
          className={[
            'absolute rounded-full blur-3xl transition-all duration-300',
            showGo ? 'w-[36rem] h-[36rem] bg-status-success/20' : 'w-96 h-96 bg-accent-primary/20 animate-glowPulse',
          ].join(' ')}
        />

        <AnimatePresence mode="wait">
          {showCountdown ? (
            <motion.div
              key={countdown}
              className="relative font-mono font-black text-[9rem] leading-none text-text-primary tabular-nums animate-stomp"
              style={{ textShadow: '0 0 60px rgb(var(--accent-primary) / 0.55)' }}
              exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.2 } }}
            >
              {countdown}
            </motion.div>
          ) : showGo ? (
            <motion.div
              key="go"
              className="relative font-mono font-black text-[8rem] leading-none tracking-widest text-status-success animate-goFlash"
              style={{ textShadow: '0 0 70px rgb(var(--status-success) / 0.6)' }}
            >
              GO
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default CountdownOverlay;
