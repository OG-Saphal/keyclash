import { useEffect, useRef, useCallback } from 'react';
import { useTypingStore } from '../store/useTypingStore';

/**
 * useKeyboardCapture – attaches a global keydown listener so users can type
 * anywhere on the page without needing to click an input first.
 *
 * We use a hidden <input> element for compatibility with mobile keyboards
 * and to leverage the browser's own text composition (IME).
 */
export function useKeyboardCapture() {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleInput = useTypingStore(s => s.handleInput);
  const handleKeyDown = useTypingStore(s => s.handleKeyDown);
  const phase = useTypingStore(s => s.phase);

  // Focus the hidden input whenever the test is idle or running
  const focusInput = useCallback(() => {
    if (phase !== 'finished') {
      inputRef.current?.focus();
    }
  }, [phase]);

  // Global click → refocus
  useEffect(() => {
    document.addEventListener('click', focusInput);
    return () => document.removeEventListener('click', focusInput);
  }, [focusInput]);

  // Auto-focus on mount and when phase changes
  useEffect(() => {
    focusInput();
  }, [focusInput, phase]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Tab → restart shortcut
      if (e.key === 'Tab') {
        e.preventDefault();
        useTypingStore.getState().restart();
        return;
      }
      handleKeyDown(e.nativeEvent);
    },
    [handleKeyDown]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInput(e.target.value);
    },
    [handleInput]
  );

  return { inputRef, onKeyDown, onInputChange };
}
