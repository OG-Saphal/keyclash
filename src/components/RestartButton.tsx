import React from 'react';
import { useTypingStore } from '../store/useTypingStore';

/**
 * RestartButton – small icon button shown during/after a test.
 * Pressing Tab also triggers restart (handled in useKeyboardCapture).
 */
const RestartButton: React.FC = () => {
  const restart = useTypingStore(s => s.restart);
  const phase = useTypingStore(s => s.phase);

  if (phase === 'finished') return null;

  return (
    <button
      onClick={restart}
      title="Restart (Tab)"
      className="group mt-6 flex items-center gap-1.5 text-text-muted text-xs font-mono
                 hover:text-accent-primary transition-colors duration-200 cursor-pointer mx-auto"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300"
      >
        <path
          fillRule="evenodd"
          d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H5.498a.75.75 0 0 0-.75.75v3.268a.75.75 0 0 0 1.5 0v-1.67l.311.311a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.454-.379ZM4.688 8.576a5.5 5.5 0 0 1 9.201-2.466l.312.311h-2.433a.75.75 0 0 0 0 1.5h3.434a.75.75 0 0 0 .75-.75V3.903a.75.75 0 0 0-1.5 0v1.67l-.311-.311A7 7 0 0 0 3.229 8.4a.75.75 0 0 0 1.46.176Z"
          clipRule="evenodd"
        />
      </svg>
      restart
      <kbd className="text-xs text-text-muted bg-bg-secondary px-1 py-0.5 rounded border border-bg-tertiary">
        tab
      </kbd>
    </button>
  );
};

export default RestartButton;
