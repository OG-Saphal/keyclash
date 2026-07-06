import { create } from 'zustand';
import { useTypingStore } from './useTypingStore';
import { useAuthStore } from './useAuthStore';
import * as mp from '../services/multiplayer.service';
import type { RoomStateDTO, RoomListEntry, CreateRoomInput, QuickMatchSettings } from '../types/multiplayer';

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface OtherPlayerProgress {
  userId: string;
  wordIndex: number;
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

  otherPlayersProgress: Record<string, OtherPlayerProgress>;

  raceWords: string[] | null;
  raceStartTimestamp: number | null;

  quickMatchStatus: 'idle' | 'searching' | 'found';
  quickMatchQueuedAt: number | null;
  quickMatchSettings: QuickMatchSettings | null;

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
  kickPlayer: (targetUserId: string) => void;
  transferHost: (targetUserId: string) => void;
  startRace: () => void;
  inviteFriendToRoom: (friendUserId: string) => void; // <-- NEW

  // ── Race integration ──
  beginProgressReporting: () => void;
  stopProgressReporting: () => void;
  submitFinalResult: () => Promise<void>;

  // ── Quick match ──
  joinQuickMatch: (settings: QuickMatchSettings) => void;
  cancelQuickMatch: () => void;
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

  beginProgressReporting: () => {
    const room = get().currentRoom;
    if (!room || progressInterval) return;
    lastReportedWordIndex = -1;

    progressInterval = setInterval(() => {
      const typingState = useTypingStore.getState();
      if (typingState.phase !== 'running') return;

      const currentRoom = get().currentRoom;
      if (!currentRoom) return;

      if (typingState.currentWordIndex === lastReportedWordIndex && typingState.metrics.wpm === 0) return;
      lastReportedWordIndex = typingState.currentWordIndex;

      const elapsedMs = typingState.startTime ? Date.now() - typingState.startTime : 0;
      mp.sendProgress(currentRoom.id, {
        wordIndex: typingState.currentWordIndex,
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
}));