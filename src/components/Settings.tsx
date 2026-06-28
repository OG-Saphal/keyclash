import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Type } from 'lucide-react';
import { useTypingStore } from '../store/useTypingStore';
import type { TestDuration, TestMode, WordCount, WordSet } from '../types';

const DURATIONS: TestDuration[] = [15, 30, 60, 120];
const WORD_COUNTS: WordCount[] = [10, 25, 50, 100];

const WORD_SETS: { id: WordSet; label: string }[] = [
  { id: 'english200', label: 'english 200' },
  { id: 'english1k', label: 'english 1k' },
  { id: 'common', label: 'common' },
];

const Settings: React.FC = () => {
  const mode      = useTypingStore(s => s.mode);
  const duration  = useTypingStore(s => s.duration);
  const wordCount = useTypingStore(s => s.wordCount);
  const wordSet   = useTypingStore(s => s.wordSet);
  const setMode      = useTypingStore(s => s.setMode);
  const setDuration  = useTypingStore(s => s.setDuration);
  const setWordCount = useTypingStore(s => s.setWordCount);
  const setWordSet   = useTypingStore(s => s.setWordSet);
  const phase = useTypingStore(s => s.phase);

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

      {/* Mode toggle: time | words */}
      <div className="flex items-center gap-1 bg-bg-secondary rounded-lg px-2 py-1.5">
        {(['time', 'words'] as TestMode[]).map(m => (
          <button
            key={m}
            onClick={() => !locked && setMode(m)}
            disabled={locked}
            className={[
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-mono transition-colors duration-150',
              mode === m
                ? 'text-accent-primary bg-accent-glow'
                : 'text-text-muted hover:text-text-primary',
              locked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
            ].join(' ')}
          >
            {m === 'time'
              ? <Clock size={12} strokeWidth={2} />
              : <Type size={12} strokeWidth={2} />
            }
            {m}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-bg-tertiary" />

      {/* Duration or word-count pills depending on mode */}
      <div className="flex items-center gap-1 bg-bg-secondary rounded-lg px-2 py-1.5">
        {mode === 'time'
          ? DURATIONS.map(d => (
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
            ))
          : WORD_COUNTS.map(wc => (
              <button
                key={wc}
                onClick={() => !locked && setWordCount(wc)}
                disabled={locked}
                className={[
                  'px-3 py-1 rounded-md text-sm font-mono transition-colors duration-150',
                  wordCount === wc
                    ? 'text-accent-primary bg-accent-glow'
                    : 'text-text-muted hover:text-text-primary',
                  locked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                ].join(' ')}
              >
                {wc}
              </button>
            ))
        }
      </div>
    </motion.div>
  );
};

export default Settings;