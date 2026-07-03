import { useCallback, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { saveResult } from '../services/results.service';
import type { TestResult } from '../types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * useSaveResult
 *
 * Call `save(result)` after a test finishes.
 * If the user is logged in → saves to Supabase.
 * If not → stores in localStorage under 'keyclash-local-results'.
 */
export function useSaveResult() {
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [status, setStatus] = useState<SaveStatus>('idle');

  const save = useCallback(async (result: TestResult) => {
    setStatus('saving');

    if (isAuthenticated && user) {
      try {
        await saveResult(user.id, result);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    } else {
      // Guest mode: persist locally
      try {
        const raw = localStorage.getItem('keyclash-local-results');
        const existing: TestResult[] = raw ? JSON.parse(raw) : [];
        existing.unshift(result);
        // Cap at 50 local results
        localStorage.setItem('keyclash-local-results', JSON.stringify(existing.slice(0, 50)));
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }

    // Reset to idle after 3 s
    setTimeout(() => setStatus('idle'), 3000);
  }, [isAuthenticated, user]);

  return { save, status, isAuthenticated };
}
