import React from 'react';
import { Swords, Trophy } from 'lucide-react';
import type { MultiplayerStatsSummary, MultiplayerRecentResult } from '../../types/multiplayerStats';

// 🆕 Feature 4 — multiplayer stats section. Purely presentational; ProfileView
// owns the fetching (via services/multiplayerStats.service.ts) and passes
// the results down. Renders nothing if the user has no multiplayer races,
// per the acceptance criteria ("only show for authenticated users who have
// played multiplayer").

interface MultiplayerStatsSectionProps {
  summary: MultiplayerStatsSummary | null;
  recent: MultiplayerRecentResult[];
  loading: boolean;
  // 🆕 Feature 8 — when this section is rendered inside ProfileView's
  // single/multiplayer toggle, the shared "Stats" heading above it already
  // establishes context, so the component's own "Multiplayer" heading is
  // redundant. Standalone usage (if any) keeps the heading by default.
  hideHeading?: boolean;
}

const resultColor = (result: 'win' | 'loss' | 'draw') => {
  if (result === 'win') return 'text-status-success';
  if (result === 'loss') return 'text-status-error';
  return 'text-text-muted';
};

const resultLabel = (r: MultiplayerRecentResult) => {
  if (r.dnf) return 'DNF';
  if (r.result === 'win') return 'Win';
  if (r.result === 'loss') return 'Loss';
  return 'Draw';
};

const MultiplayerStatsSection: React.FC<MultiplayerStatsSectionProps> = ({ summary, recent, loading, hideHeading }) => {
  if (loading) {
    return (
      <div>
        {!hideHeading && (
          <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Swords size={14} /> Multiplayer
          </h2>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-bg-secondary border border-bg-tertiary/60 rounded-xl p-4 h-16 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null; // no multiplayer races yet — section hidden entirely

  const cards = [
    { label: 'Races', value: summary.totalRaces.toLocaleString() },
    { label: 'W / L / D', value: `${summary.wins} / ${summary.losses} / ${summary.draws}` },
    { label: 'Avg race WPM', value: Math.round(summary.avgWpm).toString() },
    { label: 'Best race WPM', value: Math.round(summary.bestWpm).toString() },
  ];

  return (
    <div>
      {!hideHeading && (
        <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Swords size={14} /> Multiplayer
        </h2>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {cards.map(c => (
          <div key={c.label} className="bg-bg-secondary border border-bg-tertiary/60 rounded-xl p-4">
            <p className="text-xs text-text-muted mb-1">{c.label}</p>
            <p className="font-mono font-bold text-text-primary text-lg">{c.value}</p>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-tertiary/40 text-text-muted text-xs uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left">Date</th>
                <th className="px-4 py-2.5 text-left">Opponent(s)</th>
                <th className="px-4 py-2.5 text-right">WPM</th>
                <th className="px-4 py-2.5 text-right">Acc</th>
                <th className="px-4 py-2.5 text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(r => (
                <tr key={r.raceId} className="border-b border-bg-tertiary/20 last:border-0 hover:bg-bg-tertiary/10 transition-colors">
                  <td className="px-4 py-2.5 text-text-muted font-mono text-xs">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted text-xs truncate max-w-[160px]">
                    {r.opponents.length === 0
                      ? '—'
                      : r.opponents.slice(0, 3).map(o => o.username).join(', ') +
                        (r.opponents.length > 3 ? ` +${r.opponents.length - 3}` : '')}
                  </td>
                  <td className="px-4 py-2.5 text-right text-accent-primary font-mono font-bold">
                    {r.dnf ? '—' : r.wpm}
                  </td>
                  <td className="px-4 py-2.5 text-right text-text-muted font-mono">
                    {r.dnf ? '—' : `${r.accuracy}%`}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${resultColor(r.result)}`}>
                    {r.rank === 1 && !r.dnf && <Trophy size={11} className="inline mr-1 -mt-0.5" />}
                    {resultLabel(r)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MultiplayerStatsSection;
