import React from 'react';
import { useTypingStore } from '../store/useTypingStore';

/**
 * LiveStats — redesigned to match Timer's glass "instrument cluster" cell
 * styling so the two read as one dashboard rather than two unrelated bits
 * of text. Monospace values, small uppercase sans labels, tabular-nums so
 * digits don't jitter the layout as they change. Behavior/data source
 * unchanged.
 */
const LiveStats: React.FC = () => {
  const metrics = useTypingStore(s => s.metrics);
  const phase = useTypingStore(s => s.phase);

  if (phase === 'idle') return null;

  const stats = [
    { label: 'wpm', value: metrics.wpm },
    { label: 'raw', value: metrics.rawWpm },
    { label: 'acc', value: `${metrics.accuracy}%` },
  ];

  return (
    <div className="flex items-stretch gap-2 select-none">
      {stats.map(s => (
        <div
          key={s.label}
          className="flex flex-col items-center justify-center px-4 py-2.5  backdrop-blur-sm min-w-[4.5rem]"
        >
          <span className="text-text-muted text-[0.65rem] font-sans font-semibold uppercase tracking-[0.2em] mb-0.5">
            {s.label}
          </span>
          <span className="text-text-primary font-mono font-bold text-2xl leading-none tabular-nums">
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default LiveStats;
