import { useEffect } from 'react';
import { useVoiceStore } from '../store/useVoiceStore';

const AudioUnlocker: React.FC = () => {
    const setAudioUnlocked = useVoiceStore((s) => s.setAudioUnlocked);

    useEffect(() => {
        const unlock = () => {
            // Existing AudioContext unlock logic
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(0);
            osc.stop(0);
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            // 👇 Mark audio as unlocked – this will un-mute all VoicePeerAudio components
            setAudioUnlocked();

            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('keydown', unlock);
        };

        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('keydown', unlock, { once: true });

        return () => {
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('keydown', unlock);
        };
    }, [setAudioUnlocked]);

    return null;
};

export default AudioUnlocker;