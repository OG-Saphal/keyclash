import React from 'react';

interface Props {
  username: string;
  isSelf: boolean;
  wordIndex: number;
  totalWords: number;
  wpm: number;
  connection: 'connected' | 'disconnected' | 'abandoned';
}

const PlayerProgressBar: React.FC<Props> = ({ username, isSelf, wordIndex, totalWords, wpm, connection }) => {
  const pct = totalWords > 0 ? Math.min(100, Math.round((wordIndex / totalWords) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={`w-20 truncate ${isSelf ? 'font-semibold text-accent' : 'text-text-muted'}`}>
        {username}{isSelf ? ' (you)' : ''}
      </span>
      <div className="flex-1 h-2 rounded-full bg-bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${connection === 'connected' ? 'bg-accent' : 'bg-text-muted'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right text-text-muted">
        {connection === 'disconnected' ? 'reconnecting…' : connection === 'abandoned' ? 'left' : `${wpm} wpm`}
      </span>
    </div>
  );
};

export default PlayerProgressBar;
