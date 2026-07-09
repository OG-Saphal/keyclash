import React, { useEffect, useMemo, useRef } from 'react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useVoiceStore } from '../../store/useVoiceStore';
import { voiceService } from '../../services/voice.service';
import VoicePeerAudio from './VoicePeerAudio';
import { Mic, MicOff } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const VoiceChatPanel: React.FC = () => {
    const currentRoom = useMultiplayerStore((s) => s.currentRoom);
    const user = useAuthStore((s) => s.user);
    const {
        localStream,
        isMuted,
        localSpeaking,
        peers,
        lastActiveSpeaker,
        setLocalSpeaking,
        setLastActiveSpeaker,
    } = useVoiceStore();
    const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
    const localAnalyserRef = useRef<AnalyserNode | null>(null);
    const localAnimFrameRef = useRef<number | null>(null);
    const remoteUnmuted = useRef(false);

    const playerMap = useMemo(() => {
        if (!currentRoom?.players) return {};
        const map: Record<string, { username: string; avatarUrl?: string }> = {};
        currentRoom.players.forEach((p: any) => {
            map[p.userId] = {
                username: p.username || 'Unknown',
                avatarUrl: p.avatarUrl || undefined,
            };
        });
        return map;
    }, [currentRoom?.players]);

    // Join/leave voice based on room
    useEffect(() => {
        if (currentRoom?.id) {
            voiceService.joinVoice();
        } else {
            voiceService.leaveVoice();
            remoteUnmuted.current = false;
        }
    }, [currentRoom?.id]);

    // Local speaking detection
    useEffect(() => {
        if (!localStream) return;
        let ctx: AudioContext | null = null;
        try {
            ctx = new AudioContext();
            const src = ctx.createMediaStreamSource(localStream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            src.connect(analyser);
            localAnalyserRef.current = analyser;

            let speaking = false;
            const detect = () => {
                if (!localAnalyserRef.current) return;
                localAnalyserRef.current.getByteFrequencyData(dataArray);
                const sum = dataArray.reduce((a, b) => a + b, 0);
                const avg = sum / dataArray.length;
                const isNowSpeaking = avg > 20;
                if (isNowSpeaking !== speaking) {
                    speaking = isNowSpeaking;
                    setLocalSpeaking(speaking);
                    if (speaking) setLastActiveSpeaker('local');
                }
                localAnimFrameRef.current = requestAnimationFrame(detect);
            };
            detect();
        } catch (e) {
            console.error('Local audio analysis error', e);
        }
        return () => {
            if (localAnimFrameRef.current) cancelAnimationFrame(localAnimFrameRef.current);
            if (ctx) ctx.close();
        };
    }, [localStream, setLocalSpeaking, setLastActiveSpeaker]);

    // Mic toggle – also unmutes remote audio on first click
    const handleToggleMic = () => {
        voiceService.toggleMute();

        if (!remoteUnmuted.current) {
            Object.values(audioRefs.current).forEach(audio => {
                audio.muted = false;   // 🔈 unmute the already‑playing streams
            });
            remoteUnmuted.current = true;
        }
    };

    if (!currentRoom || !localStream) return null;

    // Speaker avatar logic
    let speakerAvatarUrl: string | undefined;
    let speakerAltText = '';
    let isCurrentlySpeaking = false;
    if (lastActiveSpeaker === 'local') {
        speakerAvatarUrl = user?.avatarUrl || '/default-avatar.png';
        speakerAltText = user?.username || 'You';
        isCurrentlySpeaking = localSpeaking;
    } else if (lastActiveSpeaker && peers[lastActiveSpeaker]) {
        const info = playerMap[lastActiveSpeaker];
        speakerAvatarUrl = info?.avatarUrl || '/default-avatar.png';
        speakerAltText = info?.username || 'User';
        isCurrentlySpeaking = peers[lastActiveSpeaker].speaking;
    }

    const setAudioRef = (peerId: string) => (el: HTMLAudioElement | null) => {
        if (el) audioRefs.current[peerId] = el;
        else delete audioRefs.current[peerId];
    };

    const peerAudios = Object.entries(peers)
        .filter(([_, peer]) => peer.stream)
        .map(([peerId, peer]) => (
            <VoicePeerAudio
                key={peerId}
                peerId={peerId}
                stream={peer.stream!}
                ref={setAudioRef(peerId)}
            />
        ));

    return (
        <>
            {peerAudios}
            <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full
                      bg-primary/90 dark:bg-secondary/90 backdrop-blur-md
                      shadow-lg shadow-black/20 border border-white/10
                      px-4 py-2 transition-colors duration-300">
                <button
                    onClick={handleToggleMic}
                    title={isMuted ? 'Unmute mic' : 'Mute mic'}
                    className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200
                      ${isMuted
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-current'
                        }`}
                >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <div className="flex items-center justify-center min-w-[36px]">
                    {speakerAvatarUrl ? (
                        <div
                            className={`relative flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300
                         ${isCurrentlySpeaking
                                    ? 'border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse-ring'
                                    : 'border-white/20'
                                }`}
                        >
                            <img
                                src={speakerAvatarUrl}
                                alt={speakerAltText}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>
                    ) : (
                        <span className="text-sm text-white/40 select-none">...</span>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 4px rgba(59,130,246,0.4); }
          50% { box-shadow: 0 0 14px rgba(59,130,246,0.7); }
          100% { box-shadow: 0 0 4px rgba(59,130,246,0.4); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 1.5s infinite;
        }
      `}</style>
        </>
    );
};

export default VoiceChatPanel;