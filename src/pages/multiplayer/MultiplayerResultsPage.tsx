import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {Trophy, Crown } from 'lucide-react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore'; // 🆕 Part 1
import { resolvePlayerColor } from '../../data/playerColors'; // 🆕 Part 1
import { fetchUserStats } from '../../services/results.service'; // 🆕 Part 4.6
import SpectatorsList from '../../components/multiplayer/SpectatorsList'; // ✨ Feature — spectator list
import Header from '../../components/Header';
import ModeTabBar from '../../components/ModeTabBar';
import Footer from '../../components/Footer';

/**
 * 🆕 Extends the existing results flow conceptually (same "race is over, show
 * a leaderboard" moment as singleplayer Results.tsx) but is its own component
 * rather than a fork of Results.tsx, since the shape of the data is
 * fundamentally different (a ranked list of players' server-verified stats,
 * not one player's own history chart).
 *
 * 🐛 FIX: the previous `isHost` calculation —
 *   `room.hostUserId === room.players.find(p => p.isHost)?.userId`
 * — compares the host's own userId to itself and is therefore always true
 * whenever the room has a host at all, regardless of who's VIEWING the page.
 * That meant every player saw the host-only Rematch/Change Settings buttons.
 * Fixed by comparing against the actually-signed-in currentUser instead.
 *
 * Part 4.5 (rematch) and Part 5 (return-to-lobby vote) are the same feature
 * — see the task consolidation note — so there's a single vote-based CTA
 * here rather than a separate one-click "Rematch" button that would race
 * against it. The old host-only "Change Settings" button is dropped too:
 * once the vote completes and everyone's back in the lobby, settings are
 * already editable there via RoomSettingsPanel.
 */
const MultiplayerResultsPage: React.FC = () => {
  const room = useMultiplayerStore((s) => s.currentRoom);
  const leaveRoom = useMultiplayerStore((s) => s.leaveRoom);
  const voteReturnToLobby = useMultiplayerStore((s) => s.voteReturnToLobby);
  const currentUser = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const navigate = useNavigate();

  const [personalBest, setPersonalBest] = useState<number | null>(null);

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

  // 🆕 Part 4.6 — personal-best delta.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    fetchUserStats(currentUser.id).then((stats) => {
      if (!cancelled) setPersonalBest(stats?.bestWpm ?? null);
    });
    return () => { cancelled = true; };
  }, [currentUser]);

  if (!room || !currentUser) return null;

  const votes = new Set(room.returnToLobbyVotes);
  const activePlayers = room.players.filter((p) => !p.isSpectator && p.connection !== 'abandoned');
  const spectators = room.players.filter((p) => p.isSpectator); // ✨ Feature — spectator list
  const myVote = votes.has(currentUser.id);
  const myResult = leaderboard.find((p) => p.userId === currentUser.id);
  // 🐛 FIX (Bug #5) — derived straight from the room roster (same pattern
  // LobbyPage uses for `isHost`), so it stays correct if this user's own
  // spectator status ever changes mid-session, rather than trusting a
  // join-time flag that could go stale.
  const isSpectator = room.players.find((p) => p.userId === currentUser.id)?.isSpectator ?? false;

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <ModeTabBar />
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full flex flex-col gap-5">

        {/* Page Header */}
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent-primary" />
          <h1 className="text-2xl font-bold">Race Results</h1>
        </div>

        {/* 🆕 Part 4.1 — podium for the top 3 */}
        {podium.length > 0 && (
          <div className="bg-bg-secondary/80 rounded-xl border border-bg-primary/20 p-6 flex items-end justify-center gap-6 shadow-sm">
            {[podium[1], podium[0], podium[2]].map((p, i) =>
              p ? (
                <div key={p.userId} className={`flex flex-col items-center ${i === 1 ? 'order-2' : ''}`}>
                  {/* 👑 Crown placed above the winner's candle */}
                  {i === 1 && <Crown className="w-7 h-7 text-amber-400 mb-1 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />}

                  <div
                    className="rounded-t-lg w-20 flex items-start justify-center pt-2 text-bg-primary font-bold text-lg"
                    style={{
                      height: i === 1 ? 96 : i === 0 ? 68 : 52,
                      background: i === 1 ? '#FFD24D' : i === 0 ? '#C0C0C0' : '#CD7F32',
                    }}
                  >
                    {p.finalStats?.wpm ?? 0}
                  </div>
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-2"
                    style={{ background: resolvePlayerColor(p.colorId, theme) }}
                  />
                  <span className="text-xs mt-1 font-medium truncate max-w-[5rem]">{p.username}</span>
                </div>
              ) : (
                <div key={`empty-podium-${i}`} className="w-20" />
              )
            )}
          </div>
        )}

        {/* Ranked list (4th+), plus per-player stat detail (Part 4.3) */}
        {rest.length > 0 && (
          <div className="bg-bg-secondary/80 rounded-xl border border-bg-primary/20 divide-y divide-bg-primary/20 shadow-sm overflow-hidden">
            {rest.map((p, i) => (
              <div key={p.userId} className="flex items-center justify-between px-5 py-3.5 hover:bg-bg-primary/20 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="w-5 text-text-muted font-mono text-sm text-center">{i + 4}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: resolvePlayerColor(p.colorId, theme) }}
                  />
                  <span className="font-medium">{p.username}</span>
                  {p.finalStats?.dnf && <span className="text-xs text-text-muted italic">(DNF)</span>}
                  {p.finalStats?.outlierFlag && (
                    <span className="text-xs text-yellow-500" title="Flagged for review — not blocked">⚑</span>
                  )}
                </div>
                <div className="flex gap-4 text-sm font-mono">
                  <span className="font-semibold text-accent-primary">{p.finalStats?.wpm ?? 0} wpm</span>
                  <span className="text-text-muted">{p.finalStats?.accuracy ?? 0}% acc</span>
                  <span className="text-text-muted hidden sm:block">{p.finalStats?.rawWpm ?? 0} raw</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🆕 Part 4.6 — personal-best delta only (micro-awards removed) */}
        <div className="bg-bg-secondary/80 rounded-xl border border-bg-primary/20 p-5 shadow-sm flex justify-end gap-4">
          {personalBest !== null && myResult?.finalStats && !myResult.finalStats.dnf && (
            <p className="text-sm text-text-muted text-right">
              {myResult.finalStats.wpm > personalBest ? (
                <span className="text-green-400 font-medium">
                  🎉 New PB! +{myResult.finalStats.wpm - personalBest} wpm
                </span>
              ) : (
                <span>{personalBest - myResult.finalStats.wpm} wpm off your PB ({personalBest})</span>
              )}
            </p>
          )}
        </div>

        {/* ✨ Feature — spectators watching the results screen */}
        <SpectatorsList spectators={spectators} variant="panel" />

        {/*
          🆕 Part 5 — return-to-lobby vote, doubling as the rematch CTA.
          🐛 FIX (Bug #5) — this used to render the same clickable vote
          button and "X of Y" count for EVERY viewer, including spectators.
          The server already excludes spectators from both the vote
          requirement (roomManager.voteReturnToLobby rejects a spectator's
          vote outright) and the "everyone's voted" completion check
          (maybeTransitionToLobby only counts active, non-abandoned
          players) — but the UI still let a spectator click "Return to
          Lobby", which silently failed server-side and made it LOOK like
          their vote was required to proceed. Spectators now get a
          read-only status line instead of a button; only active players
          see (and can act on) the vote CTA.
        */}
        {isSpectator ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-text-muted">
              👀 Spectating — {votes.size} of {activePlayers.length} players want a rematch
            </span>
            <button
              className="ml-auto px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-primary"
              onClick={() => { leaveRoom(); navigate('/multiplayer'); }}
            >
              Leave
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                myVote ? 'bg-accent text-bg-primary' : 'border border-border hover:border-accent/60'
              }`}
              onClick={() => voteReturnToLobby(!myVote)}
            >
              {myVote ? 'Waiting for others…' : 'Return to Lobby'}
            </button>
            <span className="text-sm text-text-muted">
              {votes.size} of {activePlayers.length} want a rematch
            </span>
            <button
              className="ml-auto px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-primary"
              onClick={() => { voteReturnToLobby(false); leaveRoom(); navigate('/multiplayer'); }}
            >
              Leave
            </button>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
};

export default MultiplayerResultsPage;