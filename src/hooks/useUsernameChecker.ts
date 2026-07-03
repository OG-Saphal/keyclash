import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function useUsernameChecker(username: string) {
  const [status, setStatus] = useState<UsernameStatus>('idle');
  const checkFn = useAuthStore(s => s.checkUsernameAvailable);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!username) {
      setStatus('idle');
      return;
    }

    if (!USERNAME_RE.test(username)) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const available = await checkFn(username);
        setStatus(available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [username, checkFn]);

  return status;
}
