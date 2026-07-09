import { create } from 'zustand';

export interface PeerState {
    stream: MediaStream | null;
    muted: boolean;
    speaking: boolean;
}

interface VoiceStore {
    localStream: MediaStream | null;
    isMuted: boolean;
    localSpeaking: boolean;
    peers: Record<string, PeerState>;
    lastActiveSpeaker: string | null;  // userId or 'local'

    setLocalStream: (stream: MediaStream | null) => void;
    setMuted: (muted: boolean) => void;
    setLocalSpeaking: (speaking: boolean) => void;
    addPeerStream: (userId: string, stream: MediaStream) => void;
    removePeerStream: (userId: string) => void;
    setPeerMuted: (userId: string, muted: boolean) => void;
    setPeerSpeaking: (userId: string, speaking: boolean) => void;
    setLastActiveSpeaker: (userId: string | null) => void;
    clearPeers: () => void;
    reset: () => void;
}

export const useVoiceStore = create<VoiceStore>((set) => ({
    localStream: null,
    isMuted: false,
    localSpeaking: false,
    peers: {},
    lastActiveSpeaker: null,

    setLocalStream: (stream) => set({ localStream: stream }),
    setMuted: (muted) => set({ isMuted: muted }),
    setLocalSpeaking: (speaking) =>
        set((state) => ({
            localSpeaking: speaking,
            lastActiveSpeaker: speaking ? 'local' : state.lastActiveSpeaker,
        })),
    addPeerStream: (userId, stream) =>
        set((state) => ({
            peers: {
                ...state.peers,
                [userId]: { stream, muted: false, speaking: false },
            },
        })),
    removePeerStream: (userId) =>
        set((state) => {
            const newPeers = { ...state.peers };
            delete newPeers[userId];
            return { peers: newPeers };
        }),
    setPeerMuted: (userId, muted) =>
        set((state) => ({
            peers: {
                ...state.peers,
                [userId]: { ...state.peers[userId], muted },
            },
        })),
    setPeerSpeaking: (userId, speaking) =>
        set((state) => ({
            peers: {
                ...state.peers,
                [userId]: { ...state.peers[userId], speaking },
            },
            lastActiveSpeaker: speaking ? userId : state.lastActiveSpeaker,
        })),
    setLastActiveSpeaker: (userId) => set({ lastActiveSpeaker: userId }),
    clearPeers: () => set({ peers: {}, lastActiveSpeaker: null }),
    reset: () =>
        set({
            localStream: null,
            isMuted: false,
            localSpeaking: false,
            peers: {},
            lastActiveSpeaker: null,
        }),
}));