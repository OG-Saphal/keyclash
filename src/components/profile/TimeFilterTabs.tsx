import React from 'react';
import { TIME_RANGE_OPTIONS, type TimeRangeKey } from '../../types/auth';

// 🆕 Feature 1 — time-based stats filtering. A thin, reusable tab bar; all the
// actual filtering logic (computing dateFrom, refetching stats/history) lives
// in ProfileView, which owns the selected range as state.

interface TimeFilterTabsProps {
  value: TimeRangeKey;
  onChange: (key: TimeRangeKey) => void;
  disabled?: boolean;
}

const TimeFilterTabs: React.FC<TimeFilterTabsProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TIME_RANGE_OPTIONS.map(opt => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-mono transition-colors duration-150 disabled:opacity-50',
              active
                ? 'bg-accent-primary text-bg-primary font-semibold'
                : 'bg-bg-secondary border border-bg-tertiary/60 text-text-muted hover:text-text-primary',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default TimeFilterTabs;
