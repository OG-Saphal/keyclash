// src/store/useInviteStore.ts
import { create } from 'zustand';

interface InviteState {
    invite: { roomId: string; inviterUsername: string; roomName: string } | null;
    setInvite: (invite: InviteState['invite']) => void;
    clearInvite: () => void;
}

export const useInviteStore = create<InviteState>((set) => ({
    invite: null,
    setInvite: (invite) => set({ invite }),
    clearInvite: () => set({ invite: null }),
}));