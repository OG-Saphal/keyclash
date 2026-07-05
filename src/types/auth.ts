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
  updateProfile: (data: Partial<Pick<UserProfile, 'displayName' | 'username' | 'avatarUrl'>>) => Promise<void>;
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
