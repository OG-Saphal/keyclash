import type { WordData } from '../types';

/**
 * 🆕 Part 1 — how far into the CURRENT word a player's "verified correct"
 * progress extends. Used to freeze the colored progress cursor at the first
 * uncorrected mistake. This is a pure UI/broadcast-position concern — it
 * does NOT feed into WPM/accuracy scoring (that stays exactly as computed
 * in utils/typing.ts / metrics.ts, untouched).
 *
 * Returns the offset (0..typedLength) up to and including the last
 * consecutively-correct character. As soon as one incorrect character is
 * hit — including typing past the end of the word into overflow, which is
 * incorrect by definition — everything after it stops counting. The player
 * has to actually go back and fix it (via useTypingStore's existing
 * backspace-into-previous-word support) before this can advance again.
 */
export function getFrozenOffsetInWord(word: WordData, typedLength: number): number {
  const wordLen = word.chars.length;
  for (let i = 0; i < typedLength; i++) {
    if (i >= wordLen) return i; // overflow past the word = incorrect by definition
    if (word.chars[i].state === 'incorrect') return i;
  }
  return typedLength;
}

/**
 * Converts a (wordIndex, offsetWithinThatWord) pair into the same absolute
 * "how far along the race text" character offset useMultiplayerStore's
 * beginProgressReporting already sends as `completedChars` — sum of every
 * earlier word's length + 1 (trailing space), plus the offset into the
 * current word. Pulled out as a standalone function since both the outgoing
 * race:progress payload (useMultiplayerStore.ts) and the local self-cursor
 * overlay (SelfCursorOverlay.tsx) need to agree on the exact same number.
 */
export function computeAbsoluteOffset(
  words: WordData[],
  wordIndex: number,
  offsetInWord: number,
): number {
  let total = 0;
  for (let i = 0; i < wordIndex && i < words.length; i++) {
    total += words[i].chars.length + 1;
  }
  return total + offsetInWord;
}

/**
 * 🐛 FIX (Bug #1 — "cursor jumps to the front of the word you just
 * finished") — both SelfCursorOverlay and PeerCursorOverlay looked up a
 * `[data-char-index="N"]` span inside the current word to position the
 * caret, falling back to the WHOLE word element (`wordEl`) whenever N was
 * out of range. That fallback was only ever meant to cover "cursor sits
 * AFTER the last character" (word fully typed but space not pressed yet)
 * — but reading `wordEl.getBoundingClientRect()` gives the LEFT edge of
 * the entire word box, i.e. the START of the word, not the end. So instead
 * of the caret advancing to sit after the last typed character, it snapped
 * back to the front of the word every time offsetInWord reached the
 * word's length.
 *
 * This helper centralizes the correct behavior for both overlays: when the
 * offset is still inside the word, anchor to that character's LEFT edge
 * (the caret sits just before that character, same as it always did).
 * When the offset has reached or passed the word's length, anchor to the
 * LAST character's RIGHT edge instead — the true "end of word" position.
 */
export interface CaretAnchor {
  el: HTMLElement;
  edge: 'left' | 'right';
}

export function resolveCaretAnchor(
  wordEl: HTMLElement,
  offsetInWord: number,
  wordLen: number,
): CaretAnchor {
  if (offsetInWord < wordLen) {
    const charEl = wordEl.querySelector<HTMLElement>(
      `[data-char-index="${Math.max(0, offsetInWord)}"]`,
    );
    if (charEl) return { el: charEl, edge: 'left' };
  }
  // At or past the end of the word — anchor to the LAST character's right
  // edge. Only fall back to the word wrapper itself (old, buggy behavior)
  // if the word has no characters at all (shouldn't normally happen).
  const lastCharEl = wordEl.querySelector<HTMLElement>(
    `[data-char-index="${Math.max(0, wordLen - 1)}"]`,
  );
  return lastCharEl ? { el: lastCharEl, edge: 'right' } : { el: wordEl, edge: 'left' };
}

/** Reads the correct x-coordinate (left or right edge) off a CaretAnchor. */
export function caretAnchorX(anchor: CaretAnchor, rect: DOMRect): number {
  return anchor.edge === 'right' ? rect.right : rect.left;
}
