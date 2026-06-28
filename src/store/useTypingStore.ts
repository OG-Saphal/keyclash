import { create } from 'zustand';
import type {
  TestDuration,
  WordSet,
  WordData,
  LiveMetrics,
  TestPhase,
  TestResult,
} from '../types';
import {
  generateWords,
  computeWordChars,
  finalizeWord,
  computeMetrics,
  countChars,
} from '../utils/typing';

// ─── Constants ────────────────────────────────────────────────────────────────

/** How many words to generate for a test */
const WORD_COUNT = 80;

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface TypingState {
  // ── Config ──────────────────────────────────────────────────────────────────
  duration: TestDuration;
  wordSet: WordSet;

  // ── Test State ───────────────────────────────────────────────────────────────
  phase: TestPhase;
  words: WordData[];
  currentWordIndex: number;
  currentInput: string;       // what the user has typed for the current word

  // ── Timer ────────────────────────────────────────────────────────────────────
  timeLeft: number;           // seconds remaining
  startTime: number | null;   // epoch ms when test started

  // ── Metrics ──────────────────────────────────────────────────────────────────
  metrics: LiveMetrics;
  totalKeystrokes: number;    // raw keystroke count for rawWpm
  result: TestResult | null;

  // ── Actions ──────────────────────────────────────────────────────────────────
  setDuration: (d: TestDuration) => void;
  setWordSet: (ws: WordSet) => void;
  initTest: () => void;
  startTest: () => void;
  handleInput: (value: string) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  tick: () => void;           // called every second by the timer interval
  finishTest: () => void;
  restart: () => void;
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useTypingStore = create<TypingState>((set, get) => ({
  // ── Config Defaults ──────────────────────────────────────────────────────────
  duration: 30,
  wordSet: 'english200',

  // ── Initial State ────────────────────────────────────────────────────────────
  phase: 'idle',
  words: [],
  currentWordIndex: 0,
  currentInput: '',
  timeLeft: 30,
  startTime: null,
  metrics: { wpm: 0, rawWpm: 0, accuracy: 100, correctChars: 0, incorrectChars: 0 },
  totalKeystrokes: 0,
  result: null,

  // ── Config Actions ───────────────────────────────────────────────────────────

  setDuration: (duration) => {
    set({ duration, timeLeft: duration });
    // If idle, reset immediately so the timer display updates
    if (get().phase === 'idle') {
      get().initTest();
    }
  },

  setWordSet: (wordSet) => {
    set({ wordSet });
    get().initTest();
  },

  // ── Initialise a new test (but don't start the clock) ────────────────────────

  initTest: () => {
    const { duration, wordSet } = get();
    const words = generateWords(wordSet, WORD_COUNT);
    set({
      phase: 'idle',
      words,
      currentWordIndex: 0,
      currentInput: '',
      timeLeft: duration,
      startTime: null,
      metrics: { wpm: 0, rawWpm: 0, accuracy: 100, correctChars: 0, incorrectChars: 0 },
      totalKeystrokes: 0,
      result: null,
    });
  },

  // ── Start the clock (called on first keystroke) ──────────────────────────────

  startTest: () => {
    set({ phase: 'running', startTime: Date.now() });
  },

  // ── Handle character input ───────────────────────────────────────────────────

  handleInput: (value: string) => {
    const { phase, words, currentWordIndex, startTime, totalKeystrokes } = get();

    // Don't accept input if test is over
    if (phase === 'finished') return;

    // Start the clock on first input
    if (phase === 'idle') {
      get().startTest();
    }

    const trimmedValue = value;

    // Space pressed → advance to next word
    if (value.endsWith(' ')) {
      // Prevent advancing on empty input
      if (trimmedValue.trim() === '') return;

      const updatedWords = [...words];
      const typedWord = trimmedValue.trim();

      // Finalise the current word with the typed value (without trailing space)
      updatedWords[currentWordIndex] = finalizeWord(
        computeWordChars(updatedWords[currentWordIndex], typedWord)
      );

      const nextIndex = currentWordIndex + 1;

      // If we've exhausted our word list, finish
      if (nextIndex >= updatedWords.length) {
        set({ words: updatedWords, currentInput: '', currentWordIndex: nextIndex });
        get().finishTest();
        return;
      }

      // Compute elapsed for metrics
      const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
      const ks = totalKeystrokes + 1; // count the space
      const metrics = computeMetrics(updatedWords, nextIndex, elapsed, ks);

      set({
        words: updatedWords,
        currentWordIndex: nextIndex,
        currentInput: '',
        totalKeystrokes: ks,
        metrics,
      });
      return;
    }

    // Normal character typing – update current word chars live
    const updatedWords = [...words];
    updatedWords[currentWordIndex] = computeWordChars(updatedWords[currentWordIndex], value);

    const ks = totalKeystrokes + 1;
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    const metrics = computeMetrics(updatedWords, currentWordIndex, elapsed, ks);

    set({
      words: updatedWords,
      currentInput: value,
      totalKeystrokes: ks,
      metrics,
    });
  },

  handleKeyDown: (e: KeyboardEvent) => {
    const { phase, currentWordIndex, words, currentInput } = get();
    if (phase === 'finished') return;

    // Backspace on empty input → go back to previous word
    if (e.key === 'Backspace' && currentInput === '' && currentWordIndex > 0) {
      e.preventDefault();
      const prevIndex = currentWordIndex - 1;
      const prevWord = words[prevIndex];
      // Restore the previous word to typed state (not finalised)
      const restoredWords = [...words];
      restoredWords[prevIndex] = computeWordChars(
        { ...prevWord, isCorrect: null },
        prevWord.typed
      );
      set({
        currentWordIndex: prevIndex,
        currentInput: prevWord.typed,
        words: restoredWords,
      });
    }
  },

  // ── Tick: called every second ────────────────────────────────────────────────

  tick: () => {
    const { phase, timeLeft, words, currentWordIndex, totalKeystrokes, startTime } = get();
    if (phase !== 'running') return;

    const newTimeLeft = timeLeft - 1;

    // Recompute metrics on each tick
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    const metrics = computeMetrics(words, currentWordIndex, elapsed, totalKeystrokes);

    if (newTimeLeft <= 0) {
      set({ timeLeft: 0, metrics });
      get().finishTest();
    } else {
      set({ timeLeft: newTimeLeft, metrics });
    }
  },

  // ── Finish and compute results ────────────────────────────────────────────────

  finishTest: () => {
    const { words, currentWordIndex, totalKeystrokes, duration, wordSet, startTime } = get();

    const elapsed = startTime ? (Date.now() - startTime) / 1000 : duration;
    const metrics = computeMetrics(words, currentWordIndex, elapsed, totalKeystrokes);
    const { correct: _c, incorrect: _i, total } = countChars(words, currentWordIndex);

    const result: TestResult = {
      ...metrics,
      duration,
      wordSet,
      timestamp: Date.now(),
      wordsTyped: words.slice(0, currentWordIndex).filter(w => w.isCorrect === true).length,
      totalChars: total,
    };

    set({ phase: 'finished', result, metrics });
  },

  // ── Restart: generate new words and reset ────────────────────────────────────

  restart: () => {
    get().initTest();
  },
}));
