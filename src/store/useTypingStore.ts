import { create } from 'zustand';
import type {
  TestMode,
  TestDuration,
  WordCount,
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

/** Word count for time mode (always generate a big buffer) */
const TIME_MODE_WORD_COUNT = 80;

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface TypingState {
  // ── Config ──────────────────────────────────────────────────────────────────
  mode: TestMode;
  duration: TestDuration;
  wordCount: WordCount;
  wordSet: WordSet;

  // ── Test State ───────────────────────────────────────────────────────────────
  phase: TestPhase;
  words: WordData[];
  currentWordIndex: number;
  currentInput: string;

  // ── Timer (time mode only) ───────────────────────────────────────────────────
  timeLeft: number;
  startTime: number | null;

  // ── Metrics ──────────────────────────────────────────────────────────────────
  metrics: LiveMetrics;
  totalKeystrokes: number;
  result: TestResult | null;

  // ── Actions ──────────────────────────────────────────────────────────────────
  setMode: (m: TestMode) => void;
  setDuration: (d: TestDuration) => void;
  setWordCount: (wc: WordCount) => void;
  setWordSet: (ws: WordSet) => void;
  initTest: () => void;
  startTest: () => void;
  handleInput: (value: string) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  tick: () => void;
  finishTest: () => void;
  restart: () => void;
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useTypingStore = create<TypingState>((set, get) => ({
  // ── Config Defaults ──────────────────────────────────────────────────────────
  mode: 'time',
  duration: 30,
  wordCount: 25,
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

  setMode: (mode) => {
    set({ mode });
    get().initTest();
  },

  setDuration: (duration) => {
    set({ duration, timeLeft: duration });
    if (get().phase === 'idle') {
      get().initTest();
    }
  },

  setWordCount: (wordCount) => {
    set({ wordCount });
    get().initTest();
  },

  setWordSet: (wordSet) => {
    set({ wordSet });
    get().initTest();
  },

  // ── Initialise a new test (but don't start the clock) ────────────────────────

  initTest: () => {
    const { mode, duration, wordCount, wordSet } = get();

    // In time mode generate a big buffer; in words mode generate exactly wordCount
    const count = mode === 'words' ? wordCount : TIME_MODE_WORD_COUNT;
    const words = generateWords(wordSet, count);

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
    const { phase, mode, words, currentWordIndex, startTime, totalKeystrokes } = get();

    if (phase === 'finished') return;

    if (phase === 'idle') {
      get().startTest();
    }

    // Space pressed → advance to next word
    if (value.endsWith(' ')) {
      if (value.trim() === '') return;

      const updatedWords = [...words];
      const typedWord = value.trim();

      updatedWords[currentWordIndex] = finalizeWord(
        computeWordChars(updatedWords[currentWordIndex], typedWord)
      );

      const nextIndex = currentWordIndex + 1;

      // In words mode: finish when all words are completed
      if (mode === 'words' && nextIndex >= updatedWords.length) {
        set({ words: updatedWords, currentInput: '', currentWordIndex: nextIndex });
        get().finishTest();
        return;
      }

      // In time mode: finish if we somehow exhaust the buffer (shouldn't happen)
      if (mode === 'time' && nextIndex >= updatedWords.length) {
        set({ words: updatedWords, currentInput: '', currentWordIndex: nextIndex });
        get().finishTest();
        return;
      }

      const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
      const ks = totalKeystrokes + 1;
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

    // Normal character typing
    const updatedWords = [...words];
    updatedWords[currentWordIndex] = computeWordChars(updatedWords[currentWordIndex], value);

    const ks = totalKeystrokes + 1;
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    const metrics = computeMetrics(updatedWords, currentWordIndex, elapsed, ks);

    // Words mode: auto-finish when the last word is fully typed (no space needed)
    const isLastWord = mode === 'words' && currentWordIndex === updatedWords.length - 1;
    const expectedLen = updatedWords[currentWordIndex].chars.length;
    if (isLastWord && value.length >= expectedLen) {
      updatedWords[currentWordIndex] = finalizeWord(updatedWords[currentWordIndex]);
      set({
        words: updatedWords,
        currentInput: value,
        currentWordIndex: currentWordIndex + 1,
        totalKeystrokes: ks,
        metrics,
      });
      get().finishTest();
      return;
    }

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

    if (e.key === 'Backspace' && currentInput === '' && currentWordIndex > 0) {
      e.preventDefault();
      const prevIndex = currentWordIndex - 1;
      const prevWord = words[prevIndex];
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

  // ── Tick: called every second (time mode only) ───────────────────────────────

  tick: () => {
    const { phase, mode, timeLeft, words, currentWordIndex, totalKeystrokes, startTime } = get();
    if (phase !== 'running') return;

    // In words mode the timer doesn't count down — finishing all words ends the test
    if (mode === 'words') return;

    const newTimeLeft = timeLeft - 1;
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
    const {
      mode, words, currentWordIndex, totalKeystrokes,
      duration, wordCount, wordSet, startTime,
    } = get();

    const elapsed = startTime ? (Date.now() - startTime) / 1000 : duration;
    const metrics = computeMetrics(words, currentWordIndex, elapsed, totalKeystrokes);
    const { correct: _c, incorrect: _i, total } = countChars(words, currentWordIndex);

    const result: TestResult = {
      ...metrics,
      mode,
      duration,
      wordCount,
      wordSet,
      timestamp: Date.now(),
      wordsTyped: words.slice(0, currentWordIndex).filter(w => w.isCorrect === true).length,
      totalChars: total,
    };

    set({ phase: 'finished', result, metrics });
  },

  // ── Restart ───────────────────────────────────────────────────────────────────

  restart: () => {
    get().initTest();
  },
}));