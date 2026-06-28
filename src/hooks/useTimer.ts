import { useEffect, useRef } from 'react';
import { useTypingStore } from '../store/useTypingStore';

/**
 * useTimer – drives the countdown clock.
 *
 * Starts a 1-second interval when the test phase is 'running',
 * and clears it when the phase changes away from 'running'.
 */
export function useTimer(): void {
  const phase = useTypingStore(s => s.phase);
  const tick = useTypingStore(s => s.tick);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === 'running') {
      // Tick immediately on the next second boundary
      intervalRef.current = window.setInterval(() => {
        tick();
      }, 1000);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase, tick]);
}
