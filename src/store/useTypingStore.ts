import { create } from 'zustand';
import type {
  TestMode,
  TestDuration,
  WordCount,
  WordSet,
  WordData,
  CharData,
  LiveMetrics,
  TestPhase,
  TestResult,
  WpmDataPoint,
} from '../types';
import {
  generateWords,
  computeWordChars,
  finalizeWord,
  computeMetrics,
} from '../utils/typing';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_MODE_WORD_COUNT = 80;

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface TypingState {
  mode: TestMode;
  duration: TestDuration;
  wordCount: WordCount;
  wordSet: WordSet;

  phase: TestPhase;
  words: WordData[];
  currentWordIndex: number;
  currentInput: string;

  timeLeft: number;
  startTime: number | null;

  metrics: LiveMetrics;
  totalKeystrokes: number;

  // 🆕 Cumulative, permanent counts — a mistake never gets un-counted just
  // because you backspaced and fixed it.
  totalCorrectChars: number;
  totalIncorrectChars: number;

  // 🆕 One data point recorded per second while running, for the results graph.
  wpmHistory: WpmDataPoint[];

  result: TestResult | null;

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

  // 🆕 Multiplayer integration point (see useMultiplayerStore.ts). Loads
  // server-issued race text instead of generating a random set locally, then
  // resets the rest of the state machine exactly like initTest() does.
  // Deliberately does NOT touch handleInput, handleKeyDown, tick, or
  // finishTest — the engine's actual typing/scoring logic is completely
  // unmodified; this only changes where the initial `words` array comes from.
  loadExternalWords: (words: string[], mode: TestMode, opts?: { duration?: TestDuration }) => void;
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useTypingStore = create<TypingState>((set, get) => ({
  mode: 'time',
  duration: 30,
  wordCount: 25,
  wordSet: 'english200',

  phase: 'idle',
  words: [],
  currentWordIndex: 0,
  currentInput: '',
  timeLeft: 30,
  startTime: null,
  metrics: { wpm: 0, rawWpm: 0, accuracy: 100, correctChars: 0, incorrectChars: 0 },
  totalKeystrokes: 0,
  totalCorrectChars: 0,
  totalIncorrectChars: 0,
  wpmHistory: [],
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

  // ── Initialise a new test ─────────────────────────────────────────────────────

  initTest: () => {
    const { mode, duration, wordCount, wordSet } = get();
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
      totalCorrectChars: 0,   // 🆕 reset
      totalIncorrectChars: 0, // 🆕 reset
      wpmHistory: [],         // 🆕 reset
      result: null,
    });
  },

  startTest: () => {
    set({ phase: 'running', startTime: Date.now() });
  },

  // ── Handle character input ───────────────────────────────────────────────────

  handleInput: (value: string) => {
    const {
      phase, mode, words, currentWordIndex, startTime, totalKeystrokes,
      currentInput, totalCorrectChars, totalIncorrectChars,
    } = get();

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

      if (mode === 'words' && nextIndex >= updatedWords.length) {
        set({ words: updatedWords, currentInput: '', currentWordIndex: nextIndex });
        get().finishTest();
        return;
      }

      if (mode === 'time' && nextIndex >= updatedWords.length) {
        set({ words: updatedWords, currentInput: '', currentWordIndex: nextIndex });
        get().finishTest();
        return;
      }

      const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
      const ks = totalKeystrokes + 1;
      const metrics = computeMetrics(updatedWords, nextIndex, elapsed, ks, totalCorrectChars, totalIncorrectChars);

      set({
        words: updatedWords,
        currentWordIndex: nextIndex,
        currentInput: '',
        totalKeystrokes: ks,
        metrics,
      });
      return;
    }

    // ── Normal character typing ──────────────────────────────────────────────

    // 🆕 Only NEW characters (typing forward, not backspacing) get judged and
    // permanently tallied. Backspacing never reduces these counts — a mistake
    // you go back and fix still counts as a mistake you made.
    let newCorrect = totalCorrectChars;
    let newIncorrect = totalIncorrectChars;

    if (value.length > currentInput.length) {
      const word = words[currentWordIndex];
      for (let i = currentInput.length; i < value.length; i++) {
        const expectedChar = i < word.chars.length ? word.chars[i].char : undefined;
        if (expectedChar !== undefined && value[i] === expectedChar) {
          newCorrect++;
        } else {
          newIncorrect++; // wrong char, or typed past the end of the word (overflow)
        }
      }
    }

    const updatedWords = [...words];
    updatedWords[currentWordIndex] = computeWordChars(updatedWords[currentWordIndex], value);

    const ks = totalKeystrokes + 1;
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    const metrics = computeMetrics(updatedWords, currentWordIndex, elapsed, ks, newCorrect, newIncorrect);

    const isLastWord = mode === 'words' && currentWordIndex === updatedWords.length - 1;
    const expectedLen = updatedWords[currentWordIndex].chars.length;
    if (isLastWord && value.length >= expectedLen) {
      updatedWords[currentWordIndex] = finalizeWord(updatedWords[currentWordIndex]);
      set({
        words: updatedWords,
        currentInput: value,
        currentWordIndex: currentWordIndex + 1,
        totalKeystrokes: ks,
        totalCorrectChars: newCorrect,
        totalIncorrectChars: newIncorrect,
        metrics,
      });
      get().finishTest();
      return;
    }

    set({
      words: updatedWords,
      currentInput: value,
      totalKeystrokes: ks,
      totalCorrectChars: newCorrect,   // 🆕
      totalIncorrectChars: newIncorrect, // 🆕
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

  // ── Tick: called every second ─────────────────────────────────────────────────

  tick: () => {
    const {
      phase, mode, timeLeft, words, currentWordIndex, totalKeystrokes,
      startTime, totalCorrectChars, totalIncorrectChars, wpmHistory,
    } = get();
    if (phase !== 'running') return;

    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    const metrics = computeMetrics(words, currentWordIndex, elapsed, totalKeystrokes, totalCorrectChars, totalIncorrectChars);

    // 🆕 Record a graph point every second, in both modes.
    const newHistory: WpmDataPoint[] = [
      ...wpmHistory,
      { time: Math.round(elapsed), wpm: metrics.wpm, raw: metrics.rawWpm },
    ];

    if (mode === 'words') {
      // Words mode doesn't count down, but we still track the graph.
      set({ metrics, wpmHistory: newHistory });
      return;
    }

    const newTimeLeft = timeLeft - 1;
    if (newTimeLeft <= 0) {
      set({ timeLeft: 0, metrics, wpmHistory: newHistory });
      get().finishTest();
    } else {
      set({ timeLeft: newTimeLeft, metrics, wpmHistory: newHistory });
    }
  },

  // ── Finish and compute results ────────────────────────────────────────────────

  finishTest: () => {
    const {
      mode, words, currentWordIndex, totalKeystrokes,
      duration, wordCount, wordSet, startTime,
      totalCorrectChars, totalIncorrectChars, wpmHistory,
    } = get();

    const elapsed = startTime ? (Date.now() - startTime) / 1000 : duration;
    const metrics = computeMetrics(words, currentWordIndex, elapsed, totalKeystrokes, totalCorrectChars, totalIncorrectChars);

    const result: TestResult = {
      ...metrics,
      mode,
      duration,
      wordCount,
      wordSet,
      timestamp: Date.now(),
      wordsTyped: words.slice(0, currentWordIndex).filter(w => w.isCorrect === true).length,
      totalChars: metrics.correctChars + metrics.incorrectChars,
      wpmHistory,
    };

    set({ phase: 'finished', result, metrics });
  },

  restart: () => {
    get().initTest();
  },

  // 🆕 See interface comment above. Mirrors initTest()'s reset block exactly
  // (same fields, same zeroing) — the only difference is `words` is built
  // from a given string[] instead of generateWords(). currentWordIndex,
  // metrics, cumulative counters, phase, etc. all reset the same way, so
  // handleInput/tick/finishTest behave identically afterwards regardless of
  // whether the words came from generateWords() or the server.
  loadExternalWords: (words, mode, opts) => {
    const wordData: WordData[] = words.map((word, i) => ({
      id: i,
      chars: word.split('').map((char): CharData => ({ char, state: 'pending' as const })),
      extras: [],
      typed: '',
      isCorrect: null,
    }));

    const duration = opts?.duration ?? get().duration;

    set({
      mode,
      phase: 'idle',
      words: wordData,
      currentWordIndex: 0,
      currentInput: '',
      timeLeft: duration,
      duration,
      wordCount: wordData.length as any,
      startTime: null,
      metrics: { wpm: 0, rawWpm: 0, accuracy: 100, correctChars: 0, incorrectChars: 0 },
      totalKeystrokes: 0,
      totalCorrectChars: 0,
      totalIncorrectChars: 0,
      wpmHistory: [],
      result: null,
    });
  },
}));