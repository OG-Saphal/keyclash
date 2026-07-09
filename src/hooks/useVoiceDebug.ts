// hooks/useVoiceDebug.ts
import { useEffect, useRef } from 'react';
import { useVoiceStore } from '../store/useVoiceStore';

const DEBUG_VOICE = true;

// Infer the store's state type automatically
type VoiceState = ReturnType<typeof useVoiceStore.getState>;

export function useVoiceDebug() {
  // Keep previous state snapshots to detect changes
  const prevPeersRef = useRef<Record<string, { speaking: boolean; muted: boolean }>>({});
  const prevLocalSpeakingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!DEBUG_VOICE) return;

    // Subscribe to full state changes – one argument (listener)
    const unsubscribe = useVoiceStore.subscribe((state: VoiceState) => {
      const peers = state.peers || {};
      const prevPeers = prevPeersRef.current;

      // Detect new/removed peers
      const newPeers = Object.keys(peers).filter(id => !prevPeers[id]);
      const removedPeers = Object.keys(prevPeers).filter(id => !peers[id]);

      newPeers.forEach(id => {
        console.log(`[voice] 🟢 Peer stream added: ${id}`);
      });
      removedPeers.forEach(id => {
        console.log(`[voice] 🔴 Peer stream removed: ${id}`);
      });

      // Detect speaking and mute changes per peer
      Object.keys(peers).forEach(id => {
        const peer = peers[id];
        const prevPeer = prevPeers[id] || { speaking: false, muted: false };

        if (peer.speaking !== prevPeer.speaking) {
          console.log(`[voice] 🗣️ Peer ${id} ${peer.speaking ? 'STARTED' : 'STOPPED'} speaking`);
        }
        if (peer.muted !== prevPeer.muted) {
          console.log(`[voice] ${peer.muted ? '🔇' : '🔊'} Peer ${id} ${peer.muted ? 'muted' : 'unmuted'}`);
        }
      });

      // Update previous peers reference
      prevPeersRef.current = peers;

      // Local speaking detection
      const localSpeaking = state.localSpeaking || false;
      if (localSpeaking !== prevLocalSpeakingRef.current) {
        console.log(`[voice] 🗣️ YOU ${localSpeaking ? 'STARTED' : 'STOPPED'} speaking`);
        prevLocalSpeakingRef.current = localSpeaking;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
}