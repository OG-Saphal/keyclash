// hooks/useVoiceDebug.ts
import { useEffect, useRef } from 'react';
import { useVoiceStore } from '../store/useVoiceStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';

const DEBUG_VOICE = true;

// Infer the store's state type automatically
type VoiceState = ReturnType<typeof useVoiceStore.getState>;
type PeerVoiceState = { speaking: boolean; muted: boolean };

const EMPTY_PEER: PeerVoiceState = { speaking: false, muted: false };

// 🆕 Best-effort userId → "username (userId)" label, looked up against the
// CURRENT room's player list. Falls back to the raw id if we can't find a
// match (e.g. a brief timing gap between the voice roster and room state,
// or a spectator not present in `players`). Read fresh via getState() each
// call rather than subscribed — this hook only needs the name at the moment
// it logs, not on every room-state change.
// ⚠️ ASSUMES the player DTO's name field is called `username` (matching the
// rest of the codebase — useUsernameChecker, signup, etc). If your
// RoomPlayerDTO uses a different field name, change just this one line.
function resolveDisplayName(userId: string): string {
  const players = useMultiplayerStore.getState().currentRoom?.players;
  const player = players?.find((p) => p.userId === userId);
  return player ? `${player.username} (${userId})` : userId;
}

// 🔧 SIMPLIFIED: every possible log line lives here, once, keyed by its
// exact event name — instead of rebuilding a string inline with a ternary
// every time ("STARTED"/"STOPPED", "muted"/"unmuted", etc). Reading the code
// or the console output, you see the literal event name
// (PEER_SPEAKING_START, PEER_MUTED, ...) rather than having to mentally
// evaluate a condition to know what happened.
//
// `warn` vs `log` is the other half of the simplification: speaking
// start/stop are the noisiest, most frequent events, so they use
// console.warn specifically. That lets you flip on the "Warnings" level
// filter in devtools and see ONLY speaking activity, with everything else
// (peer join/leave, mute/unmute) staying at the normal `log` level.
const VOICE_LOG = {
  PEER_ADDED: (label: string) => console.log(`[voice][PEER_ADDED] 🟢 ${label}`),
  PEER_REMOVED: (label: string) => console.log(`[voice][PEER_REMOVED] 🔴 ${label}`),
  PEER_MUTED: (label: string) => console.log(`[voice][PEER_MUTED] 🔇 ${label}`),
  PEER_UNMUTED: (label: string) => console.log(`[voice][PEER_UNMUTED] 🔊 ${label}`),
  PEER_SPEAKING_START: (label: string) => console.warn(`[voice][PEER_SPEAKING_START] 🗣️ ${label}`),
  PEER_SPEAKING_STOP: (label: string) => console.warn(`[voice][PEER_SPEAKING_STOP] 🤐 ${label}`),
  YOU_SPEAKING_START: () => console.warn(`[voice][YOU_SPEAKING_START] 🗣️ YOU`),
  YOU_SPEAKING_STOP: () => console.warn(`[voice][YOU_SPEAKING_STOP] 🤐 YOU`),
} as const;

export function useVoiceDebug() {
  // Keep previous state snapshots to detect changes
  const prevPeersRef = useRef<Record<string, PeerVoiceState>>({});
  const prevLocalSpeakingRef = useRef(false);

  useEffect(() => {
    if (!DEBUG_VOICE) return;

    const unsubscribe = useVoiceStore.subscribe((state: VoiceState) => {
      const peers = state.peers || {};
      const prevPeers = prevPeersRef.current;

      // 🔧 SIMPLIFIED: one pass over the union of old+new peer ids instead of
      // two separate filter() passes (one for "new", one for "removed")
      // followed by a third forEach for per-field changes.
      const allIds = new Set([...Object.keys(prevPeers), ...Object.keys(peers)]);

      allIds.forEach((id) => {
        const wasPresent = id in prevPeers;
        const isPresent = id in peers;
        const label = resolveDisplayName(id);

        if (isPresent && !wasPresent) {
          VOICE_LOG.PEER_ADDED(label);
        } else if (wasPresent && !isPresent) {
          VOICE_LOG.PEER_REMOVED(label);
          return; // peer is gone, nothing else to diff for this id
        }

        const prev = prevPeers[id] || EMPTY_PEER;
        const curr = peers[id];

        if (curr.speaking !== prev.speaking) {
          (curr.speaking ? VOICE_LOG.PEER_SPEAKING_START : VOICE_LOG.PEER_SPEAKING_STOP)(label);
        }
        if (curr.muted !== prev.muted) {
          (curr.muted ? VOICE_LOG.PEER_MUTED : VOICE_LOG.PEER_UNMUTED)(label);
        }
      });

      prevPeersRef.current = peers;

      // Local speaking detection
      const localSpeaking = state.localSpeaking || false;
      if (localSpeaking !== prevLocalSpeakingRef.current) {
        (localSpeaking ? VOICE_LOG.YOU_SPEAKING_START : VOICE_LOG.YOU_SPEAKING_STOP)();
        prevLocalSpeakingRef.current = localSpeaking;
      }
    });

    return unsubscribe;
  }, []);
}
