import { useEffect } from 'react';

const AudioUnlocker: React.FC = () => {
    useEffect(() => {
        const unlock = () => {
            // Create a silent AudioContext and resume it.
            // This permanently unblocks audio for the whole page.
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0; // completely silent
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(0);
            osc.stop(0);
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            // Remove the listeners after the first interaction.
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
    }, []);

    return null; // renders nothing
};

export default AudioUnlocker;