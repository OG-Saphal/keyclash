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
