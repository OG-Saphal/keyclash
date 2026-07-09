import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useVoiceStore } from '../../store/useVoiceStore';

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

    // Attach stream. Muted only if audio hasn't been unlocked yet.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !stream) return;

        audio.srcObject = stream;
        audio.muted = !audioUnlocked;   // 👈 the fix
        audio.volume = 1.0;

        audio.play().catch(err =>
            console.warn(`[voice] play error for ${peerId}:`, err.message)
        );
    }, [stream, peerId, audioUnlocked]); // re-runs when unlocked

    // Speaking detection (unchanged)
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