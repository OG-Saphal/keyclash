import React from 'react';
import { useTypingStore } from '../store/useTypingStore';

/**
 * LiveStats – compact metric strip shown during a running test.
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
    <div className="flex items-center gap-6 mb-3 select-none">
      {stats.map(s => (
        <div key={s.label} className="flex flex-col items-center">
          <span className="text-text-muted text-xs font-mono uppercase tracking-widest">
            {s.label}
          </span>
          <span className="text-text-primary font-mono font-semibold text-lg tabular-nums">
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default LiveStats;
