import { create } from 'zustand';

const THEME_STORAGE_KEY = 'keyclash-theme';
export type Theme = 'dark' | 'light';

function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

// 🆕 Part 1 — theme previously lived only in ThemeToggle.tsx's local
// useState, invisible to the rest of the app. Centralizing it here lets the
// color swatch picker and PeerCursorOverlay resolve the current theme
// reactively and re-render instantly on toggle, with no server round-trip,
// per the requirement that cursor colors re-resolve immediately on a theme
// switch mid-race. ThemeToggle.tsx now just renders UI and calls this store.
export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getPreferredTheme();
  applyTheme(initial);
  return {
    theme: initial,
    setTheme: (theme) => {
      applyTheme(theme);
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      set({ theme });
    },
    toggleTheme: () => get().setTheme(get().theme === 'light' ? 'dark' : 'light'),
  };
});
