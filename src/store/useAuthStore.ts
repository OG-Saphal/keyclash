import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  authLogin,
  authSignUp,
  authLogout,
  authResetPassword,
  authResendVerification,
  fetchCurrentProfile,
} from '../services/auth.service';
import {
  updateProfile,
  updatePassword,
  updateEmail,
  uploadAvatar,
  removeAvatar,
  checkUsernameAvailable,
} from '../services/profile.service';
import { exportData } from '../services/results.service';
import { deleteAccount } from '../services/account.service';
import type { AuthState } from '../types/auth';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  authLoading: false,
  authError: null,
  sessionExpiry: null,

  // ── Primitive setters ────────────────────────────────────────────────────────

  setUser: (user) =>
    set({ user, isAuthenticated: user !== null }),

  setAuthLoading: (authLoading) => set({ authLoading }),

  setAuthError: (authError) => set({ authError }),

  // ── Initialize on app mount (listen to Supabase auth state) ─────────────────

  initializeAuth: async () => {
    set({ authLoading: true });

    try {
      // Restore session from persisted storage
      const profile = await fetchCurrentProfile();
      set({ user: profile, isAuthenticated: profile !== null, authLoading: false });
    } catch (err) {
      // Supabase unreachable (missing env vars, network issue, etc.)
      // Still clear the loading state so the header renders buttons correctly.
      console.warn('[KeyClash] Auth init failed:', err);
      set({ user: null, isAuthenticated: false, authLoading: false });
      return; // skip the onAuthStateChange subscription — client isn't usable
    }

    // Subscribe to future auth changes (login/logout from another tab, etc.)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ user: null, isAuthenticated: false, sessionExpiry: null });
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const updatedProfile = await fetchCurrentProfile();
        set({
          user: updatedProfile,
          isAuthenticated: updatedProfile !== null,
          sessionExpiry: session.expires_at
            ? new Date(session.expires_at * 1000)
            : null,
        });
      }

      if (event === 'USER_UPDATED') {
        // Email verification confirmed
        const updatedProfile = await fetchCurrentProfile();
        if (updatedProfile) {
          set({ user: updatedProfile });
        }
      }
    });
  },

  // ── Auth actions ─────────────────────────────────────────────────────────────

  login: async (email, password, _rememberMe) => {
    set({ authLoading: false, authError: null });
    try {
      const profile = await authLogin(email, password);
      set({ user: profile, isAuthenticated: true, authLoading: false });
    } catch (err) {
      set({ authError: (err as Error).message, authLoading: false });
      throw err;
    }
  },

  signUp: async (email, password, username, displayName) => {
    set({ authLoading: false, authError: null });
    try {
      await authSignUp(email, password, username, displayName);
      set({ authLoading: false });
    } catch (err) {
      set({ authError: (err as Error).message, authLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ authLoading: true });
    try {
      await authLogout();
      set({ user: null, isAuthenticated: false, authLoading: false });
    } catch (err) {
      set({ authError: (err as Error).message, authLoading: false });
    }
  },

  resetPassword: async (email) => {
    set({ authError: null });
    try {
      await authResetPassword(email);
    } catch (err) {
      set({ authError: (err as Error).message });
      throw err;
    }
  },

  resendVerificationEmail: async () => {
    set({ authError: null });
    try {
      await authResendVerification();
    } catch (err) {
      set({ authError: (err as Error).message });
      throw err;
    }
  },

  // ── Profile actions ──────────────────────────────────────────────────────────

  updateProfile: async (fields) => {
    const { user } = get();
    if (!user) return;
    set({ authError: null });

    const dbFields: Record<string, unknown> = {};
    if (fields.displayName !== undefined) dbFields.display_name = fields.displayName;
    if (fields.username !== undefined) dbFields.username = fields.username;
    if (fields.avatarUrl !== undefined) dbFields.avatar_url = fields.avatarUrl;

    try {
      const updated = await updateProfile(user.id, dbFields as Parameters<typeof updateProfile>[1]);
      set({ user: updated });
    } catch (err) {
      set({ authError: (err as Error).message });
      throw err;
    }
  },

  updatePassword: async (currentPassword, newPassword) => {
    set({ authError: null });
    try {
      await updatePassword(currentPassword, newPassword);
    } catch (err) {
      set({ authError: (err as Error).message });
      throw err;
    }
  },

  updateEmail: async (newEmail) => {
    set({ authError: null });
    try {
      await updateEmail(newEmail);
    } catch (err) {
      set({ authError: (err as Error).message });
      throw err;
    }
  },

  uploadAvatar: async (file) => {
    const { user } = get();
    if (!user) throw new Error('Not authenticated');
    const url = await uploadAvatar(user.id, file);
    set({ user: { ...user, avatarUrl: url } });
    return url;
  },

  removeAvatar: async () => {
    const { user } = get();
    if (!user) return;
    await removeAvatar(user.id);
    set({ user: { ...user, avatarUrl: null } });
  },

  deleteAccount: async (reason) => {
    const { user } = get();
    if (!user) return;
    set({ authLoading: true });
    try {
      await deleteAccount(user.id, reason);
      set({ user: null, isAuthenticated: false, authLoading: false });
    } catch (err) {
      set({ authError: (err as Error).message, authLoading: false });
      throw err;
    }
  },

  exportUserData: async () => {
    const { user } = get();
    if (!user) throw new Error('Not authenticated');
    return exportData(user.id);
  },

  checkUsernameAvailable: async (username) => {
    return checkUsernameAvailable(username);
  },
}));