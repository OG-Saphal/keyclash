import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import Header from '../../components/Header';
import ModeTabBar from '../../components/ModeTabBar';
import Footer from '../../components/Footer';

/**
 * 🆕 Extends the existing results flow conceptually (same "race is over, show
 * a leaderboard" moment as singleplayer Results.tsx) but is its own component
 * rather than a fork of Results.tsx, since the shape of the data is
 * fundamentally different (a ranked list of players' server-verified stats,
 * not one player's own history chart). See README section on whether to
 * persist these to Supabase — not wired up yet, flagged for your decision.
 */
const MultiplayerResultsPage: React.FC = () => {
  const room = useMultiplayerStore((s) => s.currentRoom);
  const startRace = useMultiplayerStore((s) => s.startRace);
  const leaveRoom = useMultiplayerStore((s) => s.leaveRoom);
  const navigate = useNavigate();

  const leaderboard = useMemo(() => {
    if (!room) return [];
    return [...room.players]
      .filter((p) => !p.isSpectator)
      .sort((a, b) => {
        if (a.finalStats?.dnf && !b.finalStats?.dnf) return 1;
        if (!a.finalStats?.dnf && b.finalStats?.dnf) return -1;
        return (b.finalStats?.wpm ?? 0) - (a.finalStats?.wpm ?? 0);
      });
  }, [room]);

  if (!room) return null;
  const isHost = room.hostUserId === room.players.find((p) => p.isHost)?.userId;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <ModeTabBar />
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Race Results</h1>

        <div className="bg-bg-secondary border border-border rounded-xl divide-y divide-border">
          {leaderboard.map((p, i) => (
            <div key={p.userId} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-6 text-text-muted font-mono">{i + 1}</span>
                <span className="font-medium">{p.username}</span>
                {p.finalStats?.dnf && <span className="text-xs text-text-muted">(left)</span>}
                {p.finalStats?.outlierFlag && (
                  <span className="text-xs text-yellow-500" title="Flagged for review — not blocked">⚑</span>
                )}
              </div>
              <div className="flex gap-4 text-sm font-mono">
                <span>{p.finalStats?.wpm ?? 0} wpm</span>
                <span className="text-text-muted">{p.finalStats?.accuracy ?? 0}% acc</span>
                <span className="text-text-muted">{p.finalStats?.rawWpm ?? 0} raw</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          {isHost && (
            <button className="px-4 py-2 rounded-lg bg-accent text-bg-primary font-semibold" onClick={startRace}>
              Rematch
            </button>
          )}
          {isHost && (
            <button className="px-4 py-2 rounded-lg border border-border" onClick={() => navigate('/multiplayer/lobby')}>
              Change Settings
            </button>
          )}
          <button
            className="px-4 py-2 rounded-lg border border-border"
            onClick={() => { leaveRoom(); navigate('/multiplayer'); }}
          >
            Leave
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MultiplayerResultsPage;
