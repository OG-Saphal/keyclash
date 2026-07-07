import React from 'react';
import { useTypingStore } from '../store/useTypingStore';

/**
 * WordProgress – "N / total" word counter shown in words mode, in place of
 * the countdown Timer. Extracted out of App.tsx (where it lived as a
 * private, unexported component) purely so RacePage.tsx can reuse the EXACT
 * same component for multiplayer words-mode races (Items 7 & 10) instead of
 * duplicating this JSX. No behavior or markup change from the original.
 */
const WordProgress: React.FC = () => {
  const currentWordIndex = useTypingStore(s => s.currentWordIndex);
  const wordCount = useTypingStore(s => s.wordCount);
  const phase = useTypingStore(s => s.phase);
  const colorClass = phase === 'idle' ? 'text-text-muted' : 'text-text-primary';
  return (
    <div className={`text-5xl font-mono font-bold tracking-tight mb-2 ${colorClass}`}>
      {currentWordIndex}
      <span className="text-text-muted text-2xl ml-1">/ {wordCount}</span>
    </div>
  );
};

export default WordProgress;
