import React from 'react';
import { motion } from 'framer-motion';
import { useTypingStore } from '../store/useTypingStore';

// ─── Sub-component: a single big stat ────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, accent = false, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    className="flex flex-col items-center gap-1"
  >
    <span className="text-text-muted text-xs font-mono uppercase tracking-widest">{label}</span>
    <span
      className={[
        'font-mono font-semibold tabular-nums',
        accent ? 'text-accent-primary text-6xl' : 'text-text-primary text-4xl',
      ].join(' ')}
    >
      {value}
    </span>
  </motion.div>
);

// ─── Main Results ─────────────────────────────────────────────────────────────

/**
 * Results – full results screen shown when the timer expires.
 */
const Results: React.FC = () => {
  const result = useTypingStore(s => s.result);
  const restart = useTypingStore(s => s.restart);

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-10 py-8 animate-fadeIn"
    >
      {/* Primary stats row */}
      <div className="flex flex-wrap items-end justify-center gap-12">
        <StatCard label="wpm" value={result.wpm} accent delay={0} />
        <StatCard label="raw wpm" value={result.rawWpm} delay={0.1} />
        <StatCard label="accuracy" value={`${result.accuracy}%`} delay={0.2} />
      </div>

      {/* Divider */}
      <div className="w-64 h-px bg-bg-tertiary" />

      {/* Secondary stats row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex flex-wrap items-start justify-center gap-10"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-text-muted text-xs font-mono uppercase tracking-widest">
            characters
          </span>
          <span className="text-text-primary font-mono text-xl">
            <span className="text-word-correct">{result.correctChars}</span>
            <span className="text-text-muted"> / </span>
            <span className="text-word-incorrect">{result.incorrectChars}</span>
            <span className="text-text-muted text-sm"> total {result.totalChars}</span>
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-text-muted text-xs font-mono uppercase tracking-widest">
            words correct
          </span>
          <span className="text-text-primary font-mono text-xl">{result.wordsTyped}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-text-muted text-xs font-mono uppercase tracking-widest">
            duration
          </span>
          <span className="text-text-primary font-mono text-xl">{result.duration}s</span>
        </div>
      </motion.div>

      {/* Restart button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={restart}
        className="group flex items-center gap-2 px-6 py-2.5 rounded-lg bg-bg-secondary border border-bg-tertiary
                   text-text-muted font-mono text-sm hover:border-accent-primary hover:text-accent-primary
                   transition-colors duration-200 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300"
        >
          <path
            fillRule="evenodd"
            d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H5.498a.75.75 0 0 0-.75.75v3.268a.75.75 0 0 0 1.5 0v-1.67l.311.311a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.454-.379ZM4.688 8.576a5.5 5.5 0 0 1 9.201-2.466l.312.311h-2.433a.75.75 0 0 0 0 1.5h3.434a.75.75 0 0 0 .75-.75V3.903a.75.75 0 0 0-1.5 0v1.67l-.311-.311A7 7 0 0 0 3.229 8.4a.75.75 0 0 0 1.46.176Z"
            clipRule="evenodd"
          />
        </svg>
        restart
        <kbd className="ml-1 text-xs text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">tab</kbd>
      </motion.button>
    </motion.div>
  );
};

export default Results;
