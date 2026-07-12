import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore'; // 🆕 Part 1
import { resolvePlayerColor } from '../../data/playerColors'; // 🆕 Part 1
import { fetchUserStats } from '../../services/results.service'; // 🆕 Part 4.6
import SpectatorsList from '../../components/multiplayer/SpectatorsList'; // ✨ Feature — spectator list
import Podium from '../../components/multiplayer/Podium'; // 🆕 redesign — hero winner's-stage podium
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
 *
 * 🆕 Visual redesign — the podium is now the page's hero (Podium.tsx, tiered
 * winner's-stage treatment); the 4th+ list below is a dense "results sheet"
 * with alternating rows; the rematch/leave CTA moved into a fixed, elevated
 * bottom bar so it reads as a clear call to action rather than trailing
 * page content. All state/logic below is unchanged from the previous
 * version — only the return JSX changed.
 */

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

const MultiplayerResultsPage: React.FC = () => {
  const room = useMultiplayerStore((s) => s.currentRoom);
  const leaveRoom = useMultiplayerStore((s) => s.leaveRoom);
  const voteReturnToLobby = useMultiplayerStore((s) => s.voteReturnToLobby); // 🆕 Part 5
  const currentUser = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme); // 🆕 Part 1
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

  // 🆕 Part 4.6 — personal-best delta. Every multiplayer participant is
  // already authenticated (guests are gated out before they can even
  // connect — see MultiplayerAuthModal / useMultiplayerStore.connect()), so
  // there's no separate "guest skips this" branch needed here; the null
  // check below is just defensive.
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
  // 🐛 FIX (Bug #5) — derived straight from the room roster (same pattern
  // LobbyPage uses for `isHost`), so it stays correct if this user's own
  // spectator status ever changes mid-session, rather than trusting a
  // join-time flag that could go stale.
  const isSpectator = room.players.find((p) => p.userId === currentUser.id)?.isSpectator ?? false;

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // 🆕 Part 4.4 — micro-awards, computed purely from finalStats already on
  // the DTO. "Comeback" (largest mid-race rank improvement) is deliberately
  // NOT included: neither the server nor the client retains any per-tick
  // progress HISTORY today (only the latest snapshot is ever kept), so there
  // is no data to compute it from without adding new tracking — flagging
  // this rather than fabricating a result. Say the word and I'll wire up a
  // small progressHistory array server-side if you want this award.
  const fastestFingers = leaderboard.reduce<typeof leaderboard[number] | null>(
    (best, p) => ((p.finalStats?.wpm ?? 0) > (best?.finalStats?.wpm ?? 0) ? p : best),
    leaderboard[0] ?? null
  );

  return (
    <div className="relative max-h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">
      {/* 🆕 same ambient mesh treatment as RacePage, for visual continuity
          across the race -> results transition. */}
      <div className="pointer-events-none absolute inset-0 bg-mesh-race animate-meshDrift" />

      <div className="relative z-10 flex flex-col flex-1">
        <Header />
        <ModeTabBar />
        {/* pb-28 reserves room for the fixed bottom CTA bar */}
        <main className="flex-1 px-4 pt-8 pb-28 max-w-2xl mx-auto w-full flex flex-col gap-7">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Race Results</h1>
            <p className="text-xs text-text-muted mt-1">{activePlayers.length} racers · {room.settings.mode === 'time' ? `${room.settings.duration}s` : `${room.settings.wordCount} words`}</p>
          </div>

          {/* 🆕 Podium — the visual hero of the page */}
          <Podium podium={podium} theme={theme} currentUserId={currentUser.id} personalBest={personalBest} />

          {/* 🆕 Part 4.4 — micro-award, styled as a glowing sticker/badge */}
          {fastestFingers && (
            <div className="flex justify-center">
              <span
                className="px-4 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/30 text-xs font-semibold text-accent-primary"
                style={{ boxShadow: '0 0 20px rgb(var(--accent-primary) / 0.25)' }}
              >
                ⚡ Fastest fingers — {fastestFingers.username} ({fastestFingers.finalStats?.wpm ?? 0} wpm)
              </span>
            </div>
          )}

          {/* Results sheet — dense, scannable rows for 4th place onward */}
          {rest.length > 0 && (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="bg-white/5 backdrop-blur-sm border border-border rounded-2xl overflow-hidden"
            >
              {rest.map((p, i) => {
                const isSelf = p.userId === currentUser.id;
                const delta = isSelf && personalBest !== null && p.finalStats && !p.finalStats.dnf
                  ? p.finalStats.wpm - personalBest
                  : null;
                return (
                  <motion.div
                    key={p.userId}
                    variants={rowVariants}
                    className={[
                      'flex items-center justify-between px-4 py-3',
                      i % 2 === 1 ? 'bg-white/[0.02]' : '',
                      isSelf ? 'ring-1 ring-inset ring-accent-primary/30' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-text-muted font-mono text-sm shrink-0">{i + 4}</span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: resolvePlayerColor(p.colorId, theme) }}
                      />
                      <span className={`font-medium truncate ${isSelf ? 'text-accent-primary' : ''}`}>
                        {p.username}{isSelf ? ' (you)' : ''}
                      </span>
                      {p.finalStats?.dnf && <span className="text-xs text-text-muted shrink-0">(left)</span>}
                      {p.finalStats?.outlierFlag && (
                        <span className="text-xs text-status-warning shrink-0" title="Flagged for review — not blocked">⚑</span>
                      )}
                      {/* 🆕 Part 4.6 — personal-best delta, integrated next
                          to the user's own row instead of a separate
                          paragraph elsewhere on the page. */}
                      {delta !== null && (
                        <span className={`text-xs shrink-0 ${delta >= 0 ? 'text-status-success' : 'text-text-muted'}`}>
                          {delta >= 0 ? `+${delta} pb` : `${delta} vs pb`}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm font-mono shrink-0">
                      <span>{p.finalStats?.wpm ?? 0} wpm</span>
                      <span className="text-text-muted">{p.finalStats?.accuracy ?? 0}% acc</span>
                      <span className="text-text-muted">{p.finalStats?.rawWpm ?? 0} raw</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* ✨ Feature — spectators watching the results screen */}
          <SpectatorsList spectators={spectators} variant="panel" />
        </main>

        {/*
          🆕 Part 5 — return-to-lobby vote, doubling as the rematch CTA, now
          a fixed, elevated bottom bar so it reads as the page's primary
          call to action instead of trailing content.
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
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-bg-secondary/80 backdrop-blur-md">
          <div className="max-w-2xl mx-auto w-full px-4 py-3">
            {isSpectator ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-text-muted">
                  👀 Spectating — {votes.size} of {activePlayers.length} players want a rematch
                </span>
                <button
                  className="ml-auto px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors"
                  onClick={() => { leaveRoom(); navigate('/multiplayer'); }}
                >
                  Leave
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  className={`px-5 py-2.5 rounded-xl font-semibold transition-colors ${myVote
                    ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/40'
                    : 'bg-accent-primary text-bg-primary shadow-glow hover:bg-accent-hover'
                    }`}
                  onClick={() => voteReturnToLobby(!myVote)}
                >
                  {myVote ? 'Waiting for others…' : 'Return to Lobby'}
                </button>
                <span className="text-sm text-text-muted">
                  {votes.size} of {activePlayers.length} want a rematch
                </span>
                <button
                  className="ml-auto px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors"
                  onClick={() => { voteReturnToLobby(false); leaveRoom(); navigate('/multiplayer'); }}
                >
                  Leave
                </button>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default MultiplayerResultsPage;
