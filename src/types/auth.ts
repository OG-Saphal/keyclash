// ─── Auth / User Types ─────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  totalTests: number;
  totalTimeTyped: number;
  avgwpm: number;
  preferences: UserPreferences;
  /** 🆕 Bio/about-me text, max 200 chars, nullable. Edited from AccountPage. */
  bio: string | null;
}

export interface UserPreferences {
  defaultMode: 'time' | 'words';
  defaultDuration: 15 | 30 | 60 | 120;
  defaultWordCount: 10 | 25 | 50 | 100;
  defaultWordSet: 'english200' | 'english1k' | 'common';
  theme: 'dark' | 'light';
}

// ─── Auth Store Shape ──────────────────────────────────────────────────────────

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  sessionExpiry: Date | null;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  // 🆕 'bio' added to the updatable field set
  updateProfile: (data: Partial<Pick<UserProfile, 'displayName' | 'username' | 'avatarUrl' | 'bio'>>) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  removeAvatar: () => Promise<void>;
  deleteAccount: (reason?: string) => Promise<void>;
  exportUserData: () => Promise<string>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
}

// ─── Typing Result for DB ──────────────────────────────────────────────────────

export interface SaveableResult {
  mode: 'time' | 'words';
  duration: number;
  word_count: number;
  word_set: string;
  wpm: number;
  raw_wpm: number;
  accuracy: number;
  characters_typed: number;
  words_typed: number;
  correct_chars: number;
  incorrect_chars: number;
  keystrokes: number;
  time_elapsed: number;
}

export interface StoredResult extends SaveableResult {
  id: number;
  user_id: string;
  created_at: string;
}

// ─── History Filters ───────────────────────────────────────────────────────────

export interface HistoryFilters {
  mode?: 'time' | 'words';
  wordSet?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── 🆕 Time-range filter (Feature 1) ──────────────────────────────────────────

export type TimeRangeKey = '7d' | '15d' | '1m' | '3m' | '6m' | 'all';

export interface TimeRangeOption {
  key: TimeRangeKey;
  label: string;
  /** Returns an ISO date string to use as HistoryFilters.dateFrom, or null for "all time". */
  toDateFrom: () => string | null;
}

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { key: '7d', label: '7 days', toDateFrom: () => daysAgoIso(7) },
  { key: '15d', label: '15 days', toDateFrom: () => daysAgoIso(15) },
  { key: '1m', label: '1 month', toDateFrom: () => monthsAgoIso(1) },
  { key: '3m', label: '3 months', toDateFrom: () => monthsAgoIso(3) },
  { key: '6m', label: '6 months', toDateFrom: () => monthsAgoIso(6) },
  { key: 'all', label: 'All time', toDateFrom: () => null },
];

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

// ─── 🆕 Streak (Feature 2) ─────────────────────────────────────────────────────

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
}

// ─── 🆕 Activity heatmap (Feature 7) ───────────────────────────────────────────

export interface ActivityDay {
  day: string; // 'YYYY-MM-DD'
  count: number;
}
