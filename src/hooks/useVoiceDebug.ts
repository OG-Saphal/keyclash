// hooks/useVoiceDebug.ts
import { useEffect } from 'react';
import { useVoiceStore } from '../store/useVoiceStore';

const DEBUG_VOICE = true;

export function useVoiceDebug() {
    useEffect(() => {
        if (!DEBUG_VOICE) return;

        const unsubscribe = useVoiceStore.subscribe(
            (state) => state.peers,
            (peers, prevPeers) => {
                const newPeers = Object.keys(peers).filter(id => !prevPeers[id]);
                const removedPeers = Object.keys(prevPeers).filter(id => !peers[id]);

                newPeers.forEach(id => console.log(`[voice] 🟢 Peer stream added: ${id}`));
                removedPeers.forEach(id => console.log(`[voice] 🔴 Peer stream removed: ${id}`));

                Object.keys(peers).forEach(id => {
                    const nowSpeaking = peers[id]?.speaking || false;
                    const wasSpeaking = prevPeers[id]?.speaking || false;
                    if (nowSpeaking !== wasSpeaking) {
                        console.log(`[voice] 🗣️ Peer ${id} ${nowSpeaking ? 'STARTED' : 'STOPPED'} speaking`);
                    }

                    const nowMuted = peers[id]?.muted || false;
                    const wasMuted = prevPeers[id]?.muted || false;
                    if (nowMuted !== wasMuted) {
                        console.log(`[voice] ${nowMuted ? '🔇' : '🔊'} Peer ${id} ${nowMuted ? 'muted' : 'unmuted'}`);
                    }
                });
            },
            { fireImmediately: false }
        );

        const unsubscribeLocal = useVoiceStore.subscribe(
            (state) => state.localSpeaking,
            (now, prev) => {
                if (now !== prev) {
                    console.log(`[voice] 🗣️ YOU ${now ? 'STARTED' : 'STOPPED'} speaking`);
                }
            }
        );

        return () => {
            unsubscribe();
            unsubscribeLocal();
        };
    }, []);
}