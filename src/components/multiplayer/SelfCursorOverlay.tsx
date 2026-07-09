import React, { useLayoutEffect, useState } from 'react';
import { useTypingStore } from '../../store/useTypingStore';
import { useThemeStore } from '../../store/useThemeStore';
import { resolvePlayerColor, type ColorId } from '../../data/playerColors';
import { getFrozenOffsetInWord, resolveCaretAnchor, caretAnchorX } from '../../utils/multiplayerCursor';

interface Props {
  containerRef: React.RefObject<HTMLDivElement>;
  colorId: ColorId;
}

interface CaretPos { x: number; y: number; }

/**
 * 🆕 Part 1 — the LOCAL player's own colored progress cursor. Mirrors
 * PeerCursorOverlay's DOM-lookup approach (reads the data-word-index /
 * data-char-index hooks WordDisplay.tsx already renders) but for a single
 * player: the person using this client, in their own assigned color, frozen
 * at getFrozenOffsetInWord() instead of their raw typed length.
 *
 * This is a SEPARATE element from WordDisplay's own built-in blinking
 * caret. That caret is left completely alone (still always-accurate) and is
 * repurposed as the spec's "second, true caret" purely via a --text-cursor
 * CSS variable override on the wrapping container in RacePage.tsx. This
 * component only adds the NEW frozen cursor; it never duplicates true-caret
 * behavior.
 *
 * Only renders while phase === 'running' — nothing meaningful to show
 * during the countdown, and (Part 4) once the local player finishes their
 * own cursor should disappear too, same as peers'; RacePage's own
 * finish-effect already navigates away almost immediately, but gating on
 * phase here means there's no stale frozen cursor lingering even for that
 * brief window.
 */
const SelfCursorOverlay: React.FC<Props> = ({ containerRef, colorId }) => {
  const words = useTypingStore((s) => s.words);
  const currentWordIndex = useTypingStore((s) => s.currentWordIndex);
  const currentInput = useTypingStore((s) => s.currentInput);
  const phase = useTypingStore((s) => s.phase);
  const theme = useThemeStore((s) => s.theme);
  const [pos, setPos] = useState<CaretPos | null>(null);

  const currentWord = words[currentWordIndex];
  const frozenOffset = currentWord ? getFrozenOffsetInWord(currentWord, currentInput.length) : 0;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || phase !== 'running') {
      setPos(null);
      return;
    }
    const wordEl = container.querySelector<HTMLElement>(`[data-word-index="${currentWordIndex}"]`);
    if (!wordEl) {
      setPos(null);
      return;
    }
    // 🐛 FIX (Bug #1) — see resolveCaretAnchor's doc comment. Anchoring to
    // the LAST character's right edge (instead of falling back to the
    // whole word element's left edge) is what keeps the cursor at the END
    // of a just-completed word instead of snapping back to its start.
    const wordLen = currentWord ? currentWord.chars.length : 0;
    const anchor = resolveCaretAnchor(wordEl, frozenOffset, wordLen);
    const containerRect = container.getBoundingClientRect();
    const targetRect = anchor.el.getBoundingClientRect();
    setPos({
      x: caretAnchorX(anchor, targetRect) - containerRect.left + container.scrollLeft,
      y: targetRect.top - containerRect.top + container.scrollTop,
    });
  }, [containerRef, currentWordIndex, frozenOffset, phase]);

  if (!pos) return null;
  const color = resolvePlayerColor(colorId, theme);

  return (
    <div className="absolute inset-0 pointer-events-none z-20" aria-hidden="true">
      <div
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: 2,
          height: '1.4em',
          background: color,
          boxShadow: `0 0 0 1px rgb(var(--bg-primary)), 0 0 4px ${color}`,
        }}
      />
    </div>
  );
};

export default SelfCursorOverlay;
