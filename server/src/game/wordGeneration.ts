import type { WordSet } from '../rooms/types.js';

// 🆕 Kept intentionally in sync with frontend src/data/words.ts. If you add or
// change a word list on the client, mirror the change here — the server is
// the source of truth for race text, so a drifted list means the client's
// singleplayer word pool and multiplayer race text stop matching in spirit
// (not a correctness bug, just a content inconsistency worth avoiding).
import { WORD_SETS } from './wordLists.js';

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const PUNCTUATION_MARKS = ['.', ',', '!', '?', ';'];

/**
 * Generates the race text ONCE per race, server-side, so every player in the
 * room gets the exact same word list and no client can influence its own text.
 */
export function generateRaceWords(
  wordSet: WordSet,
  count: number,
  options: { punctuation?: boolean; numbers?: boolean } = {},
): string[] {
  const pool = [...(WORD_SETS[wordSet] ?? WORD_SETS.english200)];

  const chosen: string[] = [];
  while (chosen.length < count) {
    chosen.push(...shuffle([...pool]).slice(0, count - chosen.length));
  }
  let words = chosen.slice(0, count);

  if (options.numbers) {
    // Sprinkle in a number every ~8 words, replacing that slot.
    words = words.map((w, i) => (i % 8 === 7 ? String(Math.floor(Math.random() * 1000)) : w));
  }

  if (options.punctuation) {
    // Append trailing punctuation to ~1 in 6 words, and capitalize the word
    // that follows a sentence-ending mark — mirrors typical typing-test style.
    let capNext = true;
    words = words.map((w, i) => {
      const word = capNext ? w[0].toUpperCase() + w.slice(1) : w;
      capNext = false;
      if (i % 6 === 5) {
        const mark = PUNCTUATION_MARKS[Math.floor(Math.random() * PUNCTUATION_MARKS.length)];
        if (mark === '.' || mark === '!' || mark === '?') capNext = true;
        return word + mark;
      }
      return word;
    });
  }

  return words;
}
