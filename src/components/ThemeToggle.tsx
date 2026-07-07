import React from 'react';
import { useThemeStore } from '../store/useThemeStore';

const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

// 🆕 Theme state moved into useThemeStore.ts (see that file) so other
// components — the Part 1 color swatch picker, the Part 2 PeerCursorOverlay
// — can read/react to it too. This component is now a pure view over the
// store; markup/behavior are otherwise unchanged from the original.
const ThemeToggle: React.FC = () => {
    const theme = useThemeStore((s) => s.theme);
    const toggleTheme = useThemeStore((s) => s.toggleTheme);

    const isLight = theme === 'light';
    const nextTheme: 'dark' | 'light' = isLight ? 'dark' : 'light';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${nextTheme} theme`}
            style={{
                position: 'relative', display: 'inline-flex', alignItems: 'center',
                width: '56px', height: '28px', borderRadius: '9999px',
                border: '1px solid rgb(var(--bg-tertiary))', background: 'rgb(var(--bg-secondary))',
                cursor: 'pointer', padding: '0',
                transition: 'background 0.3s ease, border-color 0.3s ease', flexShrink: 0,
            }}
        >
            <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', color: isLight ? 'rgb(var(--accent-primary))' : 'rgb(var(--text-muted))', transition: 'color 0.3s ease', opacity: isLight ? 1 : 0.5 }}>
                <SunIcon className="w-full h-full" />
            </span>
            <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', color: !isLight ? 'rgb(var(--accent-primary))' : 'rgb(var(--text-muted))', transition: 'color 0.3s ease', opacity: !isLight ? 1 : 0.5 }}>
                <MoonIcon className="w-full h-full" />
            </span>
            <span style={{ position: 'absolute', top: '2px', left: isLight ? '2px' : '30px', width: '22px', height: '22px', borderRadius: '9999px', background: 'rgb(var(--accent-primary))', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)', transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </button>
    );
};

export default ThemeToggle;
