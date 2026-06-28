import React, { useEffect, useRef, useCallback } from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { useKeyboardCapture } from '../hooks/useKeyboardCapture';
import type { WordData } from '../types';

// ─── Sub-component: a single word ────────────────────────────────────────────

interface WordProps {
  word: WordData;
  isCurrent: boolean;
  currentInput: string;
  isRef: boolean;
  wordRef?: React.RefObject<HTMLSpanElement>;
}

const Word: React.FC<WordProps> = ({ word, isCurrent, currentInput, wordRef }) => {
  return (
    <span
      ref={wordRef}
      className={[
        'relative inline-flex font-mono text-lg leading-relaxed mx-0.5 px-0.5 rounded-sm transition-colors duration-75',
        isCurrent ? 'bg-bg-tertiary' : '',
      ].join(' ')}
    >
      {/* Expected characters */}
      {word.chars.map((c, i) => {
        let colorClass = 'text-word-pending';
        if (!isCurrent && word.isCorrect !== null) {
          // Completed word
          colorClass = c.state === 'correct' ? 'text-word-correct' : 'text-word-incorrect';
        } else if (isCurrent && i < currentInput.length) {
          colorClass = c.state === 'correct' ? 'text-word-correct' : 'text-word-incorrect';
        } else if (isCurrent && i === currentInput.length) {
          // The next character to type
          colorClass = 'text-word-current';
        }

        const isCaret = isCurrent && i === currentInput.length;

        return (
          <span key={i} className="relative">
            {/* Blinking caret before this character */}
            {isCaret && (
              <span
                className="absolute -left-px top-0 bottom-0 w-0.5 bg-text-cursor animate-blink rounded-full"
                aria-hidden="true"
              />
            )}
            <span className={`transition-colors duration-75 ${colorClass}`}>{c.char}</span>
          </span>
        );
      })}

      {/* Caret at end of word when fully typed (and possibly overflowing) */}
      {isCurrent && currentInput.length >= word.chars.length && word.extras.length === 0 && (
        <span
          className="absolute right-0 top-0 bottom-0 w-0.5 -mr-px bg-text-cursor animate-blink rounded-full"
          aria-hidden="true"
        />
      )}

      {/* Extra (overflow) characters */}
      {(isCurrent ? word.extras : !isCurrent && word.extras.length > 0 ? word.extras : []).map(
        (ex, i) => (
          <span
            key={`extra-${i}`}
            className="relative text-word-incorrect"
          >
            {i === word.extras.length - 1 && isCurrent && (
              <span
                className="absolute right-0 top-0 bottom-0 w-0.5 bg-text-cursor animate-blink rounded-full"
                aria-hidden="true"
              />
            )}
            {ex.char}
          </span>
        )
      )}
    </span>
  );
};

// ─── Main WordDisplay ─────────────────────────────────────────────────────────

/**
 * WordDisplay – renders the scrolling word area with a hidden input to
 * capture keystrokes.
 *
 * Layout: words flow naturally. We track the current word's DOM position and
 * scroll the container so the current line is always at the top.
 */
const WordDisplay: React.FC = () => {
  const words = useTypingStore(s => s.words);
  const currentWordIndex = useTypingStore(s => s.currentWordIndex);
  const currentInput = useTypingStore(s => s.currentInput);
  const phase = useTypingStore(s => s.phase);

  const { inputRef, onKeyDown, onInputChange } = useKeyboardCapture();
  const containerRef = useRef<HTMLDivElement>(null);
  const currentWordRef = useRef<HTMLSpanElement>(null);

  // Track the row offset so we only scroll when the current word moves to a new line
  const lastTopRef = useRef<number>(0);

  const scrollToCurrentWord = useCallback(() => {
    const container = containerRef.current;
    const currentEl = currentWordRef.current;
    if (!container || !currentEl) return;

    const wordTop = currentEl.offsetTop;

    // Only scroll when the current word starts a new visible line
    if (wordTop !== lastTopRef.current) {
      lastTopRef.current = wordTop;
      // Scroll container so the current line is always at the top of the visible area
      container.scrollTo({ top: wordTop - 8, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToCurrentWord();
  }, [currentWordIndex, scrollToCurrentWord]);

  return (
    <div className="relative w-full select-none">
      {/* Hidden input – captures all keyboard events */}
      <input
        ref={inputRef}
        value={currentInput}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Type here"
        tabIndex={0}
      />

      {/* Word container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ height: '8rem' }} // ~3 visible lines
        onClick={() => inputRef.current?.focus()}
      >
        {/* Fade masks top/bottom */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 z-10 bg-gradient-to-b from-bg-primary to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 z-10 bg-gradient-to-t from-bg-primary to-transparent" />

        <div className="flex flex-wrap gap-y-3 leading-relaxed pr-2">
          {words.map((word, i) => (
            <Word
              key={word.id}
              word={word}
              isCurrent={i === currentWordIndex}
              currentInput={i === currentWordIndex ? currentInput : ''}
              isRef={i === currentWordIndex}
              wordRef={i === currentWordIndex ? currentWordRef : undefined}
            />
          ))}
        </div>
      </div>

      {/* Idle hint */}
      {phase === 'idle' && (
        <p className="text-center text-text-muted text-sm font-mono mt-4 animate-fadeIn">
          start typing to begin
        </p>
      )}
    </div>
  );
};

export default WordDisplay;
