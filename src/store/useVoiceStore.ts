// store/useVoiceStore.ts
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
    lastActiveSpeaker: string | null;
    audioUnlocked: boolean;
    forcePlayCounter: number;                   // 👈 new

    setLocalStream: (stream: MediaStream | null) => void;
    setMuted: (muted: boolean) => void;
    setLocalSpeaking: (speaking: boolean) => void;
    addPeerStream: (userId: string, stream: MediaStream) => void;
    removePeerStream: (userId: string) => void;
    setPeerMuted: (userId: string, muted: boolean) => void;
    setPeerSpeaking: (userId: string, speaking: boolean) => void;
    setLastActiveSpeaker: (userId: string | null) => void;
    setAudioUnlocked: () => void;
    triggerForcePlay: () => void;               // 👈 new
    clearPeers: () => void;
    reset: () => void;
}

export const useVoiceStore = create<VoiceStore>((set) => ({
    localStream: null,
    isMuted: false,
    localSpeaking: false,
    peers: {},
    lastActiveSpeaker: null,
    audioUnlocked: false,
    forcePlayCounter: 0,                        // 👈 new

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
    setAudioUnlocked: () => set({ audioUnlocked: true }),
    triggerForcePlay: () => set((state) => ({ forcePlayCounter: state.forcePlayCounter + 1 })), // 👈 new
    clearPeers: () => set({ peers: {}, lastActiveSpeaker: null }),
    reset: () =>
        set({
            localStream: null,
            isMuted: false,
            localSpeaking: false,
            peers: {},
            lastActiveSpeaker: null,
            // 🐛 FIX (root cause — audio silently muted after leave/rejoin):
            // audioUnlocked reflects whether THIS BROWSER TAB has ever had a
            // user gesture unlock its AudioContext/autoplay — it has nothing
            // to do with any particular voice session. AudioUnlocker.tsx only
            // arms its click/touch/keydown listeners ONCE per page load
            // ({ once: true }, removed after firing), so once it fires there
            // is no mechanism to ever set this back to true again in the same
            // tab. Resetting it to false here on every leaveVoice() meant
            // every peer's <audio> element came back muted
            // (audio.muted = !audioUnlocked in VoicePeerAudio.tsx) after any
            // leave+rejoin that didn't happen to include a fresh page load —
            // exactly matching "works after a hard refresh, breaks on
            // in-app leave/rejoin". Deliberately NOT included in this reset.
            forcePlayCounter: 0,
        }),
}));