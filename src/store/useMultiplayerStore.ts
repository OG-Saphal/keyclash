import { create } from 'zustand';
import { useTypingStore } from './useTypingStore';
import { useAuthStore } from './useAuthStore';
import * as mp from '../services/multiplayer.service';
import type { RoomStateDTO, RoomListEntry, CreateRoomInput, QuickMatchSettings } from '../types/multiplayer';
import type { ColorId } from '../data/playerColors';
import { getFrozenOffsetInWord, computeAbsoluteOffset } from '../utils/multiplayerCursor';

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface OtherPlayerProgress {
  userId: string;
  wordIndex: number;
  completedChars: number;
  elapsedMs: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
}

interface MultiplayerState {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectionError: string | null;
  currentRoom: RoomStateDTO | null;
  asSpectator: boolean;
  roomList: RoomListEntry[];
  // Live progress of everyone EXCEPT the local player — the local player's
  // own progress lives in useTypingStore and is never duplicated here.
  otherPlayersProgress: Record<string, OtherPlayerProgress>;
  raceWords: string[] | null;
  raceStartTimestamp: number | null;
  quickMatchStatus: 'idle' | 'searching' | 'found';
  quickMatchQueuedAt: number | null;
  quickMatchSettings: QuickMatchSettings | null;
  // Guarded navigation — set when the user clicks something that would
  // navigate away (e.g. the logo) while they're in a room. The actual
  // navigate() call happens in <LeaveRoomConfirmModal>, which is the one
  // place with access to react-router's useNavigate.
  pendingNavigationTarget: string | null;
  requestNavigation: (to: string) => void;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
  lastError: { forEvent: string; code: string; message: string } | null;
  // ── Lifecycle ──
  connect: () => Promise<void>;
  disconnect: () => void;
  // ── Rooms ──
  refreshRoomList: () => void;
  createRoom: (input: CreateRoomInput) => Promise<RoomStateDTO | null>;
  joinRoom: (roomId: string, password?: string) => Promise<boolean>;
  rejoinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: () => void;
  setReady: (isReady: boolean) => void;
  updateSettings: (patch: Partial<CreateRoomInput>) => void;
  setColor: (colorId: ColorId) => void;
  kickPlayer: (targetUserId: string) => void;
  transferHost: (targetUserId: string) => void;
  startRace: () => void;
  inviteFriendToRoom: (friendUserId: string) => void; // NEW
  // ── Race integration with useTypingStore ──
  beginProgressReporting: () => void;
  stopProgressReporting: () => void;
  submitFinalResult: () => Promise<void>;
  // ── Quick match ──
  joinQuickMatch: (settings: QuickMatchSettings) => void;
  cancelQuickMatch: () => void;
  // ── Return-to-lobby vote (Part 5) ──
  voteReturnToLobby: (optIn: boolean) => void;
}

let progressInterval: ReturnType<typeof setInterval> | null = null;
let lastReportedWordIndex = -1;

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  connectionStatus: 'disconnected',
  connectionError: null,
  currentRoom: null,
  asSpectator: false,
  roomList: [],
  otherPlayersProgress: {},
  raceWords: null,
  raceStartTimestamp: null,
  quickMatchStatus: 'idle',
  quickMatchQueuedAt: null,
  quickMatchSettings: null,
  pendingNavigationTarget: null,
  requestNavigation: (to) => {
    if (get().currentRoom) set({ pendingNavigationTarget: to });
  },
  confirmNavigation: () => {
    get().leaveRoom();
    set({ pendingNavigationTarget: null });
  },
  cancelNavigation: () => set({ pendingNavigationTarget: null }),
  lastError: null,

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  connect: async () => {
    if (get().connectionStatus === 'connected' || get().connectionStatus === 'connecting') return;
    set({ connectionStatus: 'connecting', connectionError: null });
    try {
      await mp.connectMultiplayerSocket();
      set({ connectionStatus: 'connected' });
      mp.onRoomUpdated((room) => set({ currentRoom: room }));
      mp.onRoomListUpdated((roomList) => set({ roomList }));
      mp.onRoomClosed(({ roomId }) => {
        if (get().currentRoom?.id === roomId) {
          set({ currentRoom: null, raceWords: null, raceStartTimestamp: null });
        }
      });
      mp.onLobbyKicked(({ targetUserId }) => {
        const myUserId = useAuthStore.getState().user?.id;
        if (myUserId && myUserId === targetUserId) {
          set({ currentRoom: null, raceWords: null, raceStartTimestamp: null, otherPlayersProgress: {} });
        }
      });
      mp.onRaceWords(({ words, startTimestamp }) => {
        set({ raceWords: words, raceStartTimestamp: startTimestamp });
      });
      mp.onRaceProgressBroadcast((payload) => {
        set((s) => ({
          otherPlayersProgress: { ...s.otherPlayersProgress, [payload.userId]: payload },
        }));
      });
      mp.onRaceResults((room) => set({ currentRoom: room }));
      mp.onQuickMatchFound(({ room }) => {
        set({ quickMatchStatus: 'found', currentRoom: room });
      });
      mp.onServerError((payload) => set({ lastError: payload }));
    } catch (e) {
      set({ connectionStatus: 'error', connectionError: (e as Error).message });
    }
  },
  disconnect: () => {
    get().stopProgressReporting();
    mp.disconnectMultiplayerSocket();
    set({
      connectionStatus: 'disconnected',
      currentRoom: null,
      roomList: [],
      otherPlayersProgress: {},
      raceWords: null,
      raceStartTimestamp: null,
      quickMatchStatus: 'idle',
      quickMatchSettings: null,
    });
  },

  // ── Rooms ────────────────────────────────────────────────────────────────
  refreshRoomList: () => mp.requestRoomList(),
  createRoom: async (input) => {
    const res = await mp.createRoom(input);
    if (res.ok && res.room) {
      set({ currentRoom: res.room, asSpectator: false });
      return res.room;
    }
    return null;
  },
  joinRoom: async (roomId, password) => {
    const res = await mp.joinRoom(roomId, password);
    if (res.ok && res.room) {
      set({ currentRoom: res.room, asSpectator: !!res.asSpectator });
      return true;
    }
    return false;
  },
  rejoinRoom: async (roomId) => {
    const res = await mp.rejoinRoom(roomId);
    if (res.ok && res.room) {
      set({ currentRoom: res.room });
      return true;
    }
    return false;
  },
  leaveRoom: () => {
    const room = get().currentRoom;
    if (!room) return;
    get().stopProgressReporting();
    mp.leaveRoom(room.id);
    set({ currentRoom: null, raceWords: null, raceStartTimestamp: null, otherPlayersProgress: {} });
  },
  setReady: (isReady) => {
    const room = get().currentRoom;
    if (room) mp.setReady(room.id, isReady);
  },
  updateSettings: (patch) => {
    const room = get().currentRoom;
    if (room) mp.updateRoomSettings(room.id, patch);
  },
  setColor: (colorId) => {
    const room = get().currentRoom;
    if (room) mp.setColor(room.id, colorId);
  },
  kickPlayer: (targetUserId) => {
    const room = get().currentRoom;
    if (room) mp.kickPlayer(room.id, targetUserId);
  },
  transferHost: (targetUserId) => {
    const room = get().currentRoom;
    if (room) mp.transferHost(room.id, targetUserId);
  },
  startRace: () => {
    const room = get().currentRoom;
    if (room) mp.startRace(room.id);
  },

  // ─── NEW: Invite a friend to the current room ─────────────────────────────
  inviteFriendToRoom: (friendUserId) => {
    const room = get().currentRoom;
    if (!room) return;
    mp.inviteToRoom(room.id, friendUserId);
  },

  // ── Race integration ─────────────────────────────────────────────────────
  // Feeds server race text into the EXISTING typing engine, and separately
  // subscribes to useTypingStore's own state to emit throttled progress —
  // it never reimplements or forks the typing engine itself.
  beginProgressReporting: () => {
    const room = get().currentRoom;
    if (!room || progressInterval) return;
    lastReportedWordIndex = -1;
    progressInterval = setInterval(() => {
      const typingState = useTypingStore.getState();
      if (typingState.phase !== 'running') return;
      const currentRoom = get().currentRoom;
      if (!currentRoom) return;
      // Only emit when something actually changed, to avoid spamming
      // identical progress packets while the player is mid-word.
      if (typingState.currentWordIndex === lastReportedWordIndex && typingState.metrics.wpm === 0) return;
      lastReportedWordIndex = typingState.currentWordIndex;
      // 🐛 FIX (Part 1) — completedChars used to be derived from the
      // player's raw typed length (currentInput.length), so the broadcast
      // progress cursor kept advancing right through an uncorrected typo
      // instead of freezing. It's now derived from getFrozenOffsetInWord(),
      // which stops advancing at the first incorrect character in the
      // CURRENT word — distance already banked from earlier, COMPLETED
      // words is untouched, since those are already finalized/correct-or-not
      // and don't get revisited. This is the single place completedChars is
      // computed before race:progress goes out, so both the local self
      // cursor (SelfCursorOverlay.tsx, which computes the identical value
      // for its own rendering) and every peer's PeerCursorOverlay
      // automatically see the frozen value — no changes needed in either
      // overlay component for the freeze behavior itself.
      const currentWord = typingState.words[typingState.currentWordIndex];
      const frozenOffsetInWord = currentWord
        ? getFrozenOffsetInWord(currentWord, typingState.currentInput.length)
        : 0;
      const completedChars = computeAbsoluteOffset(
        typingState.words,
        typingState.currentWordIndex,
        frozenOffsetInWord,
      );
      const elapsedMs = typingState.startTime ? Date.now() - typingState.startTime : 0;
      mp.sendProgress(currentRoom.id, {
        wordIndex: typingState.currentWordIndex,
        completedChars,
        elapsedMs,
        wpm: typingState.metrics.wpm,
        rawWpm: typingState.metrics.rawWpm,
        accuracy: typingState.metrics.accuracy,
      });
    }, 350);
  },
  stopProgressReporting: () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  },
  submitFinalResult: async () => {
    const room = get().currentRoom;
    if (!room) return;
    get().stopProgressReporting();
    const typingState = useTypingStore.getState();
    const result = typingState.result;
    if (!result) return;
    await mp.finishRace(room.id, {
      completedCorrectWords: result.wordsTyped,
      totalKeystrokes: typingState.totalKeystrokes,
      totalCorrectChars: result.correctChars,
      totalIncorrectChars: result.incorrectChars,
      clientElapsedMs: typingState.startTime ? Date.now() - typingState.startTime : 0,
    });
  },

  // ── Quick match ──────────────────────────────────────────────────────────
  joinQuickMatch: (settings) => {
    set({ quickMatchStatus: 'searching', quickMatchQueuedAt: Date.now(), quickMatchSettings: settings });
    mp.joinQuickMatch(settings);
  },
  cancelQuickMatch: () => {
    mp.cancelQuickMatch();
    set({ quickMatchStatus: 'idle', quickMatchQueuedAt: null, quickMatchSettings: null });
  },

  // ── Return-to-lobby vote (Part 5) ───────────────────────────────────────
  voteReturnToLobby: (optIn) => {
    const room = get().currentRoom;
    if (room) mp.voteReturnToLobby(room.id, optIn);
  },
}));