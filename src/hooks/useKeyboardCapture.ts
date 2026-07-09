import { useEffect, useRef, useCallback } from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';

/**
 * useKeyboardCapture – attaches a global keydown listener so users can type
 * anywhere on the page without needing to click an input first.
 *
 * We use a hidden <input> element for compatibility with mobile keyboards
 * and to leverage the browser's own text composition (IME).
 *
 * 🐛 FIX (Bugs #6 and #7) — this hook is shared by both solo mode
 * (TypingView) and multiplayer (RacePage), via the hidden <input> rendered
 * inside WordDisplay.tsx. Rather than threading new props down through
 * WordDisplay (which would touch a file this fix doesn't otherwise need
 * to change), this hook reads the multiplayer store directly — which is
 * already global and already `null`/`false` whenever we're not in a
 * multiplayer room, so solo mode's behavior is completely unaffected:
 *
 *  - Bug #6: Tab restarted the test even mid-race, swapping the current
 *    race's words out from under everyone. Tab now only calls restart()
 *    when we're NOT in a multiplayer room; inside one, it still
 *    preventDefault()s (so focus doesn't jump away) but is otherwise a
 *    no-op.
 *  - Bug #7: a spectator's hidden input was still focusable and typable —
 *    typing routed real keystrokes into a typing-engine state machine that
 *    was never actually started for them (no loadExternalWords/startTest
 *    ever ran for a spectator), which is what froze the UI. Spectators now
 *    never get auto-focused, and any input/keydown that does reach the
 *    hidden input is ignored outright.
 */
export function useKeyboardCapture() {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleInput = useTypingStore(s => s.handleInput);
  const handleKeyDown = useTypingStore(s => s.handleKeyDown);
  const phase = useTypingStore(s => s.phase);
  const currentRoom = useMultiplayerStore(s => s.currentRoom);
  const asSpectator = useMultiplayerStore(s => s.asSpectator);
  const inMultiplayerRoom = !!currentRoom;

  // Focus the hidden input whenever the test is idle or running — except
  // for spectators, who should never be able to type at all (Bug #7).
  const focusInput = useCallback(() => {
    if (phase !== 'finished' && !asSpectator) {
      inputRef.current?.focus();
    }
  }, [phase, asSpectator]);

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
      // Bug #7 — spectators shouldn't be able to drive the typing engine
      // at all; swallow every keystroke before it reaches handleKeyDown.
      if (asSpectator) {
        e.preventDefault();
        return;
      }
      // Tab → restart shortcut (solo only — Bug #6)
      if (e.key === 'Tab') {
        e.preventDefault();
        if (!inMultiplayerRoom) {
          useTypingStore.getState().restart();
        }
        // Inside a multiplayer race, Tab is intentionally a no-op beyond
        // preventDefault: restarting would swap out the server-issued race
        // text mid-race for every renderer relying on this client's own
        // state, which makes no sense when the text is shared and
        // server-authoritative.
        return;
      }
      handleKeyDown(e.nativeEvent);
    },
    [handleKeyDown, asSpectator, inMultiplayerRoom]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Bug #7 — ignore all typed input from spectators. This is the
      // actual root cause of the freeze: a spectator's local useTypingStore
      // never had loadExternalWords/startTest called for it (they're not
      // racing), so routing real keystrokes into handleInput operated on
      // an untstarted/empty state machine and locked up the UI.
      if (asSpectator) return;
      handleInput(e.target.value);
    },
    [handleInput, asSpectator]
  );

  return { inputRef, onKeyDown, onInputChange, disabled: asSpectator };
}
