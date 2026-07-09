import { create } from 'zustand';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'failed' | 'disconnected';

interface ConnectionStore {
  status: ConnectionStatus;
  reconnectAttempt: number;
  setStatus: (status: ConnectionStatus, reconnectAttempt?: number) => void;
}

/**
 * Tracks the live state of the Socket.IO multiplayer connection so the UI
 * can show something other than nothing when a reconnect is in progress or
 * has given up.
 *
 * Previously (RCA §3.1) there was no listener for `reconnect_failed` at all —
 * once the retry budget ran out the socket just sat disconnected forever with
 * zero feedback anywhere in the app. multiplayer.service.ts now updates this
 * store on every connect/disconnect/reconnect_attempt/reconnect/reconnect_failed
 * event; components can subscribe to `status` to render a banner and a manual
 * retry action (see ConnectionStatusBanner.tsx).
 */
export const useConnectionStore = create<ConnectionStore>((set) => ({
  status: 'disconnected',
  reconnectAttempt: 0,
  setStatus: (status, reconnectAttempt = 0) => set({ status, reconnectAttempt }),
}));
