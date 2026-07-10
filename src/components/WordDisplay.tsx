import React, { useLayoutEffect, useRef, useCallback } from 'react';
import { Lock } from 'lucide-react';
import { useTypingStore } from '../store/useTypingStore';
import { useKeyboardCapture } from '../hooks/useKeyboardCapture';
import { getFrozenOffsetInWord } from '../utils/multiplayerCursor';
import type { WordData } from '../types';

// ─── Sub-component: a single word ────────────────────────────────────────────

interface WordProps {
  word: WordData;
  isCurrent: boolean;
  currentInput: string;
  isRef: boolean;
  wordIndex: number; // 🆕 Part 2 — needed for the data-word-index lookup hook
  wordRef?: React.RefObject<HTMLSpanElement>;
  // 🆕 hide the raw/live caret whenever it sits at the exact same position
  // as the synchronized (frozen) cursor rendered by SelfCursorOverlay, so
  // the two don't visually double up. Only ever passed `true` from
  // RacePage.tsx — solo mode never sets this, since there's no sync
  // cursor to defer to and the raw caret must always be visible there.
  hideCaretWhenSynced?: boolean;
}

// 🆕 shared caret visual — a bright, glowing bar rather than a thin hairline,
// so it reads as the anchor point of the whole race track. Kept as a small
// helper so the three call sites (before-char, end-of-word, overflow) stay
// pixel-identical.
const Caret: React.FC<{ extra?: boolean }> = ({ extra }) => (
  <span
    className={[
      'absolute top-0 w-[3px] rounded-full bg-accent-primary animate-blink',
      extra ? 'right-0' : '-left-px',
    ].join(' ')}
    style={{ height: '1.5em', boxShadow: '0 0 10px rgb(var(--accent-primary) / 0.85), 0 0 22px rgb(var(--accent-primary) / 0.4)' }}
    aria-hidden="true"
  />
);

const Word: React.FC<WordProps> = ({ word, isCurrent, currentInput, wordIndex, wordRef, hideCaretWhenSynced }) => {
  // Computed once per word (not per character) — pure function of the same
  // word/input data the engine already has, shared with SelfCursorOverlay
  // so both sides agree on exactly where "frozen" is.
  const frozenOffset = hideCaretWhenSynced ? getFrozenOffsetInWord(word, currentInput.length) : -1;
  const caretMatchesSync = hideCaretWhenSynced && currentInput.length === frozenOffset;
  return (
    <span
      ref={wordRef}
      data-word-index={wordIndex} // 🆕 Part 2 — lookup hook for PeerCursorOverlay; no visual change
      className={[
        'relative inline-flex font-mono text-xl leading-relaxed mx-0.5 px-1 py-0.5 rounded-md transition-colors duration-150 ease-out',
        isCurrent ? 'bg-accent-primary/10' : '',
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
        // 🆕 Part 3.5 — subtle, non-punishing pulse on the character that
        // was JUST typed incorrectly (the char immediately behind the
        // caret). Purely visual — doesn't touch computeWordChars or any
        // scoring state, and never shakes the whole screen.
        const justWrong = isCurrent && i === currentInput.length - 1 && c.state === 'incorrect';
        return (
          <span key={i} className="relative" data-char-index={i}>
            {/* Glowing caret before this character.
                🐛 FIX (local/sync caret mismatch) — sized and centered to
                match SelfCursorOverlay's frozen cursor and dimmed via the
                sync check so the raw/live caret (which moves on every
                keystroke, including typos) reads as visually distinct from
                the synchronized/frozen progress cursor rendered on top. */}
            {isCaret && !caretMatchesSync && <Caret />}
            <span
              className={`transition-colors duration-150 ease-out ${colorClass} ${justWrong ? 'animate-pulse' : ''}`}
              style={justWrong ? { textShadow: '0 0 6px rgb(var(--status-error) / 0.6)' } : undefined}
            >
              {c.char}
            </span>
          </span>
        );
      })}
      {/* Caret at end of word when fully typed (and possibly overflowing). */}
      {isCurrent && currentInput.length >= word.chars.length && word.extras.length === 0 && !caretMatchesSync && (
        <span className="absolute right-0 top-0">
          <Caret extra />
        </span>
      )}
      {/* Extra (overflow) characters */}
      {(isCurrent ? word.extras : !isCurrent && word.extras.length > 0 ? word.extras : []).map(
        (ex, i) => (
          <span
            key={`extra-${i}`}
            className="relative text-word-incorrect"
          >
            {i === word.extras.length - 1 && isCurrent && !caretMatchesSync && <Caret extra />}
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
 * 🆕 Visual redesign — the container now reads as a "track" (a recessed
 * bg-track surface with a faint top sheen and a soft inset edge) instead of
 * a plain box, and the caret is a bright glowing bar rather than a hairline
 * so it's the clear visual anchor of the whole page. Layout/scroll logic is
 * completely unchanged — words still flow naturally and the container still
 * scrolls the current line to the top synchronously (see the Bug #2 note
 * below, preserved verbatim since the fix still applies).
 */
const WordDisplay: React.FC<{ hideCaretWhenSynced?: boolean }> = ({ hideCaretWhenSynced }) => {
  const words = useTypingStore(s => s.words);
  const currentWordIndex = useTypingStore(s => s.currentWordIndex);
  const currentInput = useTypingStore(s => s.currentInput);
  const phase = useTypingStore(s => s.phase);
  const { inputRef, onKeyDown, onKeyUp, onInputChange, capsLockOn } = useKeyboardCapture();
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
      // 🐛 FIX (Bug #2 — cursor misalignment on line transitions) — this
      // used to animate with `behavior: 'smooth'`, which plays out over
      // several frames AFTER paint (since it ran inside a plain
      // useEffect). Any cursor overlay that positions itself off this
      // container/word's getBoundingClientRect() (see
      // utils/multiplayerCursor.ts's resolveCaretAnchor/caretAnchorX,
      // used by SelfCursorOverlay/PeerCursorOverlay) could sample a rect
      // mid-scroll-animation, landing a few pixels off from where the
      // text actually settles. Scrolling instantly, inside
      // useLayoutEffect (synchronously, before the browser paints),
      // means the container is already at its final resting position by
      // the time anything — including sibling overlay components — reads
      // layout for that same render. No more animated window for the
      // caret to desync in.
      container.scrollTo({ top: wordTop - 8, behavior: 'auto' });
    }
  }, []);

  useLayoutEffect(() => {
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
        onKeyUp={onKeyUp}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Type here"
        tabIndex={0}
      />
      {/* Track surface */}
      <div
        className="relative rounded-2xl bg-track bg-track-sheen shadow-dash px-6 py-5"
      >
        {/* ✨ Feature — Caps Lock indicator. Shared by solo + multiplayer
            since both render through this same component; absolutely
            positioned so it never shifts the track's layout when it
            appears/disappears. */}
        {capsLockOn && (
          <div
            className="absolute -top-3 right-4 z-20 flex items-center gap-1.5 rounded-full text-white text-xs font-semibold px-3 py-1 shadow-md animate-fadeIn select-none"
            style={{ backgroundColor: 'rgb(var(--status-error) / 0.92)' }}
            role="status"
          >
            <Lock className="w-3 h-3" />
            Caps Lock is on
          </div>
        )}
        <div
          ref={containerRef}
          data-word-scroll-container // 🆕 Part 3 — stable lookup hook so PeerCursorOverlay/SelfCursorOverlay can find the actual scrolling/clipping box for visibility checks; no visual or behavioral change on its own
          className="relative overflow-hidden"
          style={{ height: '8.5rem' }} // ~3 visible lines
          onClick={() => inputRef.current?.focus()}
        >
          {/* Fade mask — bottom only. No top mask: the current line is
              always scrolled to the top of the box, so fading it just dims
              the text you're actively typing for no benefit. */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-7 z-10 bg-gradient-to-t from-track to-transparent" />
          <div className="flex flex-wrap gap-y-3 leading-relaxed pr-2">
            {words.map((word, i) => (
              <Word
                key={word.id}
                word={word}
                isCurrent={i === currentWordIndex}
                currentInput={i === currentWordIndex ? currentInput : ''}
                isRef={i === currentWordIndex}
                wordIndex={i}
                wordRef={i === currentWordIndex ? currentWordRef : undefined}
                hideCaretWhenSynced={hideCaretWhenSynced}
              />
            ))}
          </div>
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
