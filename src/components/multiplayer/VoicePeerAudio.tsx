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
    const hasPlayedRef = useRef(false); // avoid repeated play attempts

    useImperativeHandle(ref, () => audioRef.current!, [audioRef]);

    // Attach stream when it changes
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !stream) return;
        audio.srcObject = stream;
        // Attempt to play now, but it might be blocked → will be retried on user click
        attemptPlay();
    }, [stream]);

    const attemptPlay = () => {
        const audio = audioRef.current;
        if (!audio || hasPlayedRef.current) return;
        audio.play()
            .then(() => {
                console.log(`[voice] Audio playing for ${peerId}`);
                hasPlayedRef.current = true;
            })
            .catch(err => {
                console.warn(`[voice] Play failed for ${peerId}:`, err.message);
                // will retry on user interaction
            });
    };

    // Retry play on any user interaction (one-time global listener per instance)
    useEffect(() => {
        const resumeHandler = () => {
            attemptPlay();
            // Also resume AudioContext if needed
            if (ctxRef.current?.state === 'suspended') {
                ctxRef.current.resume();
            }
        };

        document.addEventListener('click', resumeHandler, { once: true });
        // Also listen to the custom event fired by the panel
        document.addEventListener('voice:resume-contexts', resumeHandler);

        return () => {
            document.removeEventListener('click', resumeHandler);
            document.removeEventListener('voice:resume-contexts', resumeHandler);
        };
    }, [peerId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Speaking detection (unchanged, just uses AudioContext)
    useEffect(() => {
        if (!stream) return;

        let ctx: AudioContext | null = null;
        let analyser: AnalyserNode | null = null;

        const setup = async () => {
            try {
                ctx = new AudioContext();
                ctxRef.current = ctx;
                if (ctx.state === 'suspended') {
                    console.log(`[voice] AudioContext for ${peerId} suspended – will resume on click`);
                }
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