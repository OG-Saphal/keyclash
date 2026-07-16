import React from 'react';
import { User, Users } from 'lucide-react';

export type StatsMode = 'single' | 'multiplayer';

interface StatsModeToggleProps {
    value: StatsMode;
    onChange: (mode: StatsMode) => void;
    disabled?: boolean;
    multiplayerDisabledReason?: string | null;
}

const OPTIONS: { key: StatsMode; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { key: 'single', label: 'Single player', icon: User },
    { key: 'multiplayer', label: 'Multiplayer', icon: Users },
];

// Segmented control for flipping the Stats block between single-player and
// multiplayer data in place — same grid slot, no page reflow. Mirrors the
// visual language of TimeFilterTabs so the two controls read as one family.
const StatsModeToggle: React.FC<StatsModeToggleProps> = ({ value, onChange, disabled, multiplayerDisabledReason }) => (
    <div
        role="tablist"
        aria-label="Stats mode"
        className="inline-flex items-center gap-0.5 bg-bg-tertiary/30 rounded-lg p-0.5"
    >
        {OPTIONS.map(({ key, label, icon: Icon }) => {
            const active = value === key;
            const optionDisabled = disabled || (key === 'multiplayer' && !!multiplayerDisabledReason);
            return (
                <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={optionDisabled}
                    title={key === 'multiplayer' ? multiplayerDisabledReason ?? undefined : undefined}
                    onClick={() => onChange(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        active
                            ? 'bg-bg-secondary text-text-primary border border-bg-tertiary/60'
                            : 'text-text-muted hover:text-text-secondary'
                    }`}
                >
                    <Icon size={13} />
                    {label}
                </button>
            );
        })}
    </div>
);

export default StatsModeToggle;
