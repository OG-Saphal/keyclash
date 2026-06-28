// ─── Test Configuration ───────────────────────────────────────────────────────

/** Test mode: countdown timer or fixed word count */
export type TestMode = 'time' | 'words';

/** Available test durations in seconds (used in time mode) */
export type TestDuration = 15 | 30 | 60 | 120;

/** Available word counts (used in words mode) */
export type WordCount = 10 | 25 | 50 | 100;

/** Available word list identifiers */
export type WordSet = 'english200' | 'english1k' | 'common';

// ─── Word / Character State ────────────────────────────────────────────────────

/** Per-character typing state */
export type CharState = 'pending' | 'correct' | 'incorrect';

/** A single character within a word */
export interface CharData {
  char: string;
  state: CharState;
}

/** A word in the test, made up of characters */
export interface WordData {
  id: number;
  chars: CharData[];
  /** Extra characters typed beyond the word length (overflow) */
  extras: CharData[];
  typed: string; // full typed string for this word
  isCorrect: boolean | null; // null = not yet completed
}

// ─── Live Metrics ─────────────────────────────────────────────────────────────

export interface LiveMetrics {
  /** Correctly typed words × 60 / elapsed seconds */
  wpm: number;
  /** All keystrokes (chars) × 12 / elapsed seconds */
  rawWpm: number;
  /** Correct chars / total chars typed × 100 */
  accuracy: number;
  /** Total correct characters typed */
  correctChars: number;
  /** Total incorrect characters typed (including backspaced ones) */
  incorrectChars: number;
}

// ─── Test Phase ────────────────────────────────────────────────────────────────

export type TestPhase = 'idle' | 'running' | 'finished';

// ─── Results ──────────────────────────────────────────────────────────────────

export interface TestResult extends LiveMetrics {
  mode: TestMode;
  duration: TestDuration;   // only meaningful when mode === 'time'
  wordCount: WordCount;     // only meaningful when mode === 'words'
  wordSet: WordSet;
  timestamp: number;
  wordsTyped: number;
  totalChars: number;
}