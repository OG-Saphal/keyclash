import { WORD_SETS } from '../data/words';
import type { WordData, CharData, CharState, LiveMetrics, WordSet } from '../types';

// ─── Word Generation ──────────────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle – mutates and returns the array.
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a list of unique random words from the given word set.
 * @param wordSet  key into WORD_SETS
 * @param count    how many words to produce
 */
export function generateWords(wordSet: WordSet, count: number): WordData[] {
  const pool = [...WORD_SETS[wordSet]];

  // If we need more words than the pool, cycle through it again
  const chosen: string[] = [];
  while (chosen.length < count) {
    chosen.push(...shuffle([...pool]).slice(0, count - chosen.length));
  }

  return chosen.slice(0, count).map((word, i): WordData => ({
    id: i,
    chars: word.split('').map((char): CharData => ({ char, state: 'pending' as CharState })),
    extras: [],
    typed: '',
    isCorrect: null,
  }));
}

// ─── Typing Logic ─────────────────────────────────────────────────────────────

/**
 * Given a word and the current typed string, compute the per-character states.
 */
export function computeWordChars(word: WordData, typed: string): WordData {
  const chars: CharData[] = word.chars.map((c, i) => {
    if (i >= typed.length) return { char: c.char, state: 'pending' as CharState };
    return {
      char: c.char,
      state: typed[i] === c.char ? ('correct' as CharState) : ('incorrect' as CharState),
    };
  });

  // Extra characters typed beyond word length
  const extras: CharData[] = typed.length > word.chars.length
    ? typed.slice(word.chars.length).split('').map((ch): CharData => ({
        char: ch,
        state: 'incorrect' as CharState,
      }))
    : [];

  const isCorrect = typed.length === word.chars.length && typed === word.chars.map(c => c.char).join('')
    ? true
    : null; // null until word is completed

  return { ...word, chars, extras, typed, isCorrect };
}

/**
 * Mark a word as completed (space was pressed) and flag it correct/incorrect.
 */
export function finalizeWord(word: WordData): WordData {
  const expectedWord = word.chars.map(c => c.char).join('');
  const isCorrect = word.typed === expectedWord;
  return { ...word, isCorrect };
}

// ─── Metrics Calculation ──────────────────────────────────────────────────────

/**
 * Count correct/incorrect characters across all words processed so far.
 */
export function countChars(words: WordData[], currentWordIndex: number): {
  correct: number;
  incorrect: number;
  total: number;
} {
  let correct = 0;
  let incorrect = 0;

  words.forEach((word, wi) => {
    if (wi > currentWordIndex) return; // not yet reached

    // Characters within the expected word length
    word.chars.forEach((c, ci) => {
      if (wi === currentWordIndex) {
        // current word – only count typed chars
        if (ci < word.typed.length) {
          if (c.state === 'correct') correct++;
          else if (c.state === 'incorrect') incorrect++;
        }
      } else {
        // completed word
        if (c.state === 'correct') correct++;
        else if (c.state === 'incorrect') incorrect++;
      }
    });

    // Extra characters (overflow = always incorrect)
    word.extras.forEach(() => {
      incorrect++;
    });
  });

  return { correct, incorrect, total: correct + incorrect };
}

/**
 * Compute live typing metrics.
 * @param words           all words in the test
 * @param currentWordIdx  index of the word currently being typed
 * @param elapsedSeconds  time since the test started
 * @param totalKeystrokes total raw keystrokes (including mistakes & backspaces)
 */
export function computeMetrics(
  words: WordData[],
  currentWordIdx: number,
  elapsedSeconds: number,
  totalKeystrokes: number,
): LiveMetrics {
  if (elapsedSeconds <= 0) {
    return { wpm: 0, rawWpm: 0, accuracy: 0, correctChars: 0, incorrectChars: 0 };
  }

  const minutesElapsed = elapsedSeconds / 60;

  // Count correctly completed words (not the current one being typed)
  const completedCorrectWords = words
    .slice(0, currentWordIdx)
    .filter(w => w.isCorrect === true).length;

  // Standard WPM: correct words / minutes (a "word" = 5 chars by the standard definition,
  // but Monkeytype counts actual correct words instead)
  const wpm = Math.round(completedCorrectWords / minutesElapsed);

  // Raw WPM: total keystrokes / 5 / minutes
  const rawWpm = Math.round(totalKeystrokes / 5 / minutesElapsed);

  const { correct, incorrect, total } = countChars(words, currentWordIdx);
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;

  return { wpm, rawWpm, accuracy, correctChars: correct, incorrectChars: incorrect };
}

// ─── Timer Helpers ────────────────────────────────────────────────────────────

/** Format seconds into MM:SS */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;
}
