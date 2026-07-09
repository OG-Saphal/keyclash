// VoicePeerAudio.tsx
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useVoiceStore } from '../../store/useVoiceStore';

const DEBUG_VOICE = true;

interface Props {
    peerId: string;
    stream: MediaStream;
}

const VoicePeerAudio = forwardRef<HTMLAudioElement, Props>(({ peerId, stream }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const ctxRef = useRef<AudioContext | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const audioUnlocked = useVoiceStore((s) => s.audioUnlocked);

    useImperativeHandle(ref, () => audioRef.current!, [audioRef]);

    // 1) Attach stream only when the stream itself changes
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (audio.srcObject !== stream) {
            audio.srcObject = stream;
            audio.volume = 1.0;
            if (DEBUG_VOICE) console.log(`[voice] 🔊 Attached stream for peer ${peerId}`);
            audio.play().catch((err) => {
                if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                    console.warn(`[voice] play error for ${peerId}:`, err.message);
                }
            });
        }

        return () => {
            if (audio.srcObject === stream) {
                audio.srcObject = null;
                if (DEBUG_VOICE) console.log(`[voice] 🔇 Detached stream for peer ${peerId}`);
            }
        };
    }, [stream, peerId]);

    // 2) Handle mute/unmute without resetting srcObject
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.muted = !audioUnlocked;
        if (DEBUG_VOICE) console.log(`[voice] ${audioUnlocked ? '🔓' : '🔒'} Peer ${peerId} ${audioUnlocked ? 'unmuted' : 'muted'}`);

        if (audioUnlocked && audio.paused) {
            audio.play().catch((err) => {
                if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                    console.warn(`[voice] retry play for ${peerId}:`, err.message);
                }
            });
        }
    }, [audioUnlocked, peerId]);

    // 3) Speaking detection with debug logs
    useEffect(() => {
        if (!stream) return;
        let ctx: AudioContext | null = null;
        let analyser: AnalyserNode | null = null;

        const setup = () => {
            try {
                ctx = new AudioContext();
                ctxRef.current = ctx;
                const src = ctx.createMediaStreamSource(stream);
                analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                src.connect(analyser);

                let speaking = false;
                const detect = () => {
                    if (!analyser) return;
                    analyser.getByteFrequencyData(dataArray);
                    const sum = dataArray.reduce((a, b) => a + b, 0);
                    const avg = sum / dataArray.length;
                    const isNowSpeaking = avg > 20;
                    if (isNowSpeaking !== speaking) {
                        speaking = isNowSpeaking;
                        useVoiceStore.getState().setPeerSpeaking(peerId, speaking);
                        if (speaking) {
                            useVoiceStore.getState().setLastActiveSpeaker(peerId);
                        }
                        if (DEBUG_VOICE) console.log(`[voice] 🗣️ Peer ${peerId} ${speaking ? 'STARTED' : 'STOPPED'} speaking`);
                    }
                    animFrameRef.current = requestAnimationFrame(detect);
                };
                detect();
            } catch (e) {
                console.error(`Audio analysis error for ${peerId}`, e);
            }
        };
        setup();

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (ctx) ctx.close();
        };
    }, [stream, peerId]);

    return <audio ref={audioRef} playsInline />;
});

export default VoicePeerAudio;