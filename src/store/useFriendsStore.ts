// src/store/useFriendsStore.ts
import { create } from 'zustand';
import * as friendsService from '../services/friends.service';
import type { FriendRequest, FriendProfileSummary, FriendshipStatus } from '../types/friends';

interface FriendsState {
    friends: FriendRequest[];
    incoming: FriendRequest[];
    outgoing: FriendRequest[];
    searchResults: FriendProfileSummary[];
    loading: boolean;
    error: string | null;

    sidebarOpen: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;

    loadAll: (userId: string) => Promise<void>;
    search: (query: string, myUserId: string) => Promise<void>;
    clearSearch: () => void;

    sendRequest: (myUserId: string, receiverId: string) => Promise<void>;
    accept: (requestId: string, userId: string) => Promise<void>;
    decline: (requestId: string, userId: string) => Promise<void>;
    cancel: (requestId: string, userId: string) => Promise<void>;
    unfriend: (requestId: string, userId: string) => Promise<void>;

    getFriendshipStatus: (
        myUserId: string,
        otherUserId: string,
    ) => Promise<{ status: FriendshipStatus; requestId: string | null }>;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
    friends: [],
    incoming: [],
    outgoing: [],
    searchResults: [],
    loading: false,
    error: null,

    sidebarOpen: false,
    toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
    closeSidebar: () => set({ sidebarOpen: false }),

    loadAll: async (userId) => {
        set({ loading: true, error: null });
        try {
            const [friends, incoming, outgoing] = await Promise.all([
                friendsService.fetchFriends(userId),
                friendsService.fetchIncomingRequests(userId),
                friendsService.fetchOutgoingRequests(userId),
            ]);
            set({ friends, incoming, outgoing, loading: false });
        } catch (err) {
            set({ error: (err as Error).message, loading: false });
        }
    },

    search: async (query, myUserId) => {
        try {
            const results = await friendsService.searchUsersByUsername(query, myUserId);
            set({ searchResults: results });
        } catch (err) {
            set({ error: (err as Error).message });
        }
    },

    clearSearch: () => set({ searchResults: [] }),

    sendRequest: async (myUserId, receiverId) => {
        await friendsService.sendFriendRequest(myUserId, receiverId);
        await get().loadAll(myUserId);
    },

    accept: async (requestId, userId) => {
        await friendsService.respondToRequest(requestId, true);
        await get().loadAll(userId);
    },

    decline: async (requestId, userId) => {
        await friendsService.respondToRequest(requestId, false);
        await get().loadAll(userId);
    },

    cancel: async (requestId, userId) => {
        await friendsService.cancelRequest(requestId);
        await get().loadAll(userId);
    },

    unfriend: async (requestId, userId) => {
        await friendsService.removeFriend(requestId);
        await get().loadAll(userId);
    },

    getFriendshipStatus: (myUserId, otherUserId) =>
        friendsService.fetchFriendshipStatus(myUserId, otherUserId),
}));