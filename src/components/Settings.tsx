import React from 'react';
import { motion } from 'framer-motion';
import { useTypingStore } from '../store/useTypingStore';
import type { TestDuration, WordSet } from '../types';

const DURATIONS: TestDuration[] = [15, 30, 60, 120];

const WORD_SETS: { id: WordSet; label: string }[] = [
  { id: 'english200', label: 'english 200' },
  { id: 'english1k', label: 'english 1k' },
  { id: 'common', label: 'common' },
];

/**
 * Settings – compact pill-based config bar above the typing area.
 * Only visible in idle/running phase; hidden on results screen.
 */
const Settings: React.FC = () => {
  const duration = useTypingStore(s => s.duration);
  const wordSet = useTypingStore(s => s.wordSet);
  const setDuration = useTypingStore(s => s.setDuration);
  const setWordSet = useTypingStore(s => s.setWordSet);
  const phase = useTypingStore(s => s.phase);

  // Lock settings while running
  const locked = phase === 'running';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-4 justify-center mb-6 select-none"
    >
      {/* Word set selector */}
      <div className="flex items-center gap-1 bg-bg-secondary rounded-lg px-2 py-1.5">
        {WORD_SETS.map(ws => (
          <button
            key={ws.id}
            onClick={() => !locked && setWordSet(ws.id)}
            disabled={locked}
            className={[
              'px-3 py-1 rounded-md text-sm font-mono transition-colors duration-150',
              wordSet === ws.id
                ? 'text-accent-primary bg-accent-glow'
                : 'text-text-muted hover:text-text-primary',
              locked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
            ].join(' ')}
          >
            {ws.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-bg-tertiary" />

      {/* Duration selector */}
      <div className="flex items-center gap-1 bg-bg-secondary rounded-lg px-2 py-1.5">
        {DURATIONS.map(d => (
          <button
            key={d}
            onClick={() => !locked && setDuration(d)}
            disabled={locked}
            className={[
              'px-3 py-1 rounded-md text-sm font-mono transition-colors duration-150',
              duration === d
                ? 'text-accent-primary bg-accent-glow'
                : 'text-text-muted hover:text-text-primary',
              locked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
            ].join(' ')}
          >
            {d}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default Settings;
