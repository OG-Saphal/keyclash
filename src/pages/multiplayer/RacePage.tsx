import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTypingStore } from '../../store/useTypingStore';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore'; // 🆕 Part 1 — drives the true-caret color override
import { useTimer } from '../../hooks/useTimer';
import Header from '../../components/Header';
import Timer from '../../components/Timer'; // 🆕 Part 10 — HUD parity with solo mode
import LiveStats from '../../components/LiveStats'; // 🆕 Part 10
import WordProgress from '../../components/WordProgress'; // 🆕 Part 7/10 — words-mode live progress, shared with solo TypingView
import WordDisplay from '../../components/WordDisplay';
import PlayerProgressBar from '../../components/multiplayer/PlayerProgressBar';
import PeerCursorOverlay from '../../components/multiplayer/PeerCursorOverlay'; // 🆕 Part 2
import SelfCursorOverlay from '../../components/multiplayer/SelfCursorOverlay'; // 🆕 Part 1
import RaceLeaderboard from '../../components/multiplayer/RaceLeaderboard'; // 🆕 Part 5

/**
 * Multiplayer race view. Reuses the EXISTING typing engine wholesale for the
 * local player — this component never reimplements typing logic, it only:
 *  1. Feeds server-generated race text into useTypingStore (loadExternalWords)
 *  2. Starts the test at the server's startTimestamp (synced countdown),
 *     not on the player's first keystroke
 *  3. Reports the local player's own progress to the server (throttled,
 *     via useMultiplayerStore.beginProgressReporting)
 *  4. Renders everyone else's progress as race-track bars + a live cursor
 *     overlay + a full leaderboard (Part 5), plus (Part 10) the same
 *     Timer/WordProgress + LiveStats HUD solo mode shows, and (Part 6) a
 *     drift-free server-synced match timer for time-mode races.
 */
const RacePage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme); // 🆕 Part 1
  const room = useMultiplayerStore((s) => s.currentRoom);
  const raceWords = useMultiplayerStore((s) => s.raceWords);
  const raceStartTimestamp = useMultiplayerStore((s) => s.raceStartTimestamp ?? room?.startTimestamp ?? null);
  const otherPlayersProgress = useMultiplayerStore((s) => s.otherPlayersProgress);
  const beginProgressReporting = useMultiplayerStore((s) => s.beginProgressReporting);
  const stopProgressReporting = useMultiplayerStore((s) => s.stopProgressReporting);
  const submitFinalResult = useMultiplayerStore((s) => s.submitFinalResult);
  const loadExternalWords = useTypingStore((s) => s.loadExternalWords);
  const startTest = useTypingStore((s) => s.startTest);
  const phase = useTypingStore((s) => s.phase);
  const words = useTypingStore((s) => s.words);
  const currentWordIndex = useTypingStore((s) => s.currentWordIndex);
  const localWpm = useTypingStore((s) => s.metrics.wpm);
  const localAccuracy = useTypingStore((s) => s.metrics.accuracy); // 🆕 Part 5
  useTimer(); // existing hook — ticks the engine every second while running; UNTOUCHED (see Part 6 note below)
  const [countdown, setCountdown] = useState<number | null>(null);
  // 🆕 Part 3.4 — briefly holds a "GO" flash open once the countdown hits
  // zero, before switching to the race view. Purely presentational; the
  // actual start still fires exactly at raceStartTimestamp regardless of
  // whether this flash is showing.
  const [showGo, setShowGo] = useState(false);
  const wordsLoadedRef = useRef(false);
  const raceStartedRef = useRef(false);
  const finishSubmittedRef = useRef(false);
  const timeoutFinishRef = useRef(false); // 🆕 Part 6 — guards the server-timeout-driven finishTest() call below
  const wordDisplayContainerRef = useRef<HTMLDivElement>(null); // 🆕 Part 2 — overlay anchor
  // 🆕 Part 3.2/3.3 — rank tracking for overtake arrows + mini-leaderboard
  const prevRankRef = useRef<Record<string, number>>({});

  // Load server race text into the existing engine, once, as soon as it arrives.
  useEffect(() => {
    if (raceWords && !wordsLoadedRef.current && room) {
      wordsLoadedRef.current = true;
      loadExternalWords(raceWords, room.settings.mode, { duration: room.settings.duration });
    }
  }, [raceWords, room, loadExternalWords]);

  // Synced countdown, driven by server clock, not local timers.
  useEffect(() => {
    if (!raceStartTimestamp) return;
    const tick = () => {
      const msLeft = raceStartTimestamp - Date.now();
      if (msLeft <= 0) {
        setCountdown(0);
        if (!raceStartedRef.current && wordsLoadedRef.current) {
          raceStartedRef.current = true;
          setShowGo(true);
          setTimeout(() => setShowGo(false), 500); // brief GO flash, then reveal the race UI
          startTest(); // start exactly on server time, not on first keystroke
          beginProgressReporting();
        }
      } else {
        setCountdown(Math.ceil(msLeft / 1000));
      }
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [raceStartTimestamp, startTest, beginProgressReporting]);

  // 🆕 Part 6 — server-synced match countdown (time mode only).
  //
  // useTimer() above still drives the engine's own 1-second tick() call —
  // that is LEFT COMPLETELY ALONE. tick() is also what triggers
  // finishTest() when time runs out and what records the per-second
  // wpmHistory graph point; both are real, shared engine responsibilities
  // this deliberately does not duplicate or fork.
  //
  // What this effect adds: every 100ms (same cadence as the pre-race
  // countdown above), it OVERWRITES the displayed `timeLeft` value with one
  // derived straight from `raceStartTimestamp + duration`, the same
  // server-anchored pattern the pre-race countdown already uses. Because
  // tick() always decrements from whatever `timeLeft` currently holds, this
  // overwrite makes tick()'s own countdown self-correct on every cycle
  // instead of drifting from setInterval jitter or a throttled background
  // tab — every client converges on the identical displayed number.
  //
  // As a safety net for the case where a THROTTLED tab stalls its own
  // 1-second tick() interval entirely (so tick() itself might not notice
  // zero for a while): once the server-derived time actually reaches zero,
  // this calls the engine's existing finishTest() action directly, guarded
  // by a ref so it only ever fires once. This applies an EXISTING engine
  // action from the integration layer — the same category of thing
  // loadExternalWords() already does — not new engine logic. Solo mode is
  // completely unaffected, since this effect only exists here in
  // RacePage.tsx and never runs outside a multiplayer race.
  useEffect(() => {
    if (!raceStartTimestamp || !room || room.settings.mode !== 'time') return;
    const syncInterval = setInterval(() => {
      if (useTypingStore.getState().phase !== 'running') return;
      const endsAt = raceStartTimestamp + room.settings.duration * 1000;
      const synced = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      if (synced <= 0) {
        if (!timeoutFinishRef.current) {
          timeoutFinishRef.current = true;
          useTypingStore.setState({ timeLeft: 0 });
          useTypingStore.getState().finishTest();
        }
        return;
      }
      if (useTypingStore.getState().timeLeft !== synced) {
        useTypingStore.setState({ timeLeft: synced });
      }
    }, 100);
    return () => clearInterval(syncInterval);
  }, [raceStartTimestamp, room]);

  // Local player finished -> submit authoritative result to server, then move on.
  useEffect(() => {
    // 🐛 FIX (Part 8) — `useTypingStore` is a GLOBAL store, so on a rematch
    // (new race:words after a return-to-lobby vote completes) RacePage
    // remounts fresh — but `phase` can still read as the leftover
    // 'finished' from the PREVIOUS race for exactly one render, until the
    // loadExternalWords effect above resets it to 'idle'. Both effects run
    // in the same commit; this one used to fire on that stale value with no
    // guard, immediately calling submitFinalResult() (which silently
    // no-ops since `result` was already cleared to null) and navigating
    // straight to /multiplayer/results — before the new race's countdown
    // ever had a chance to show, landing the player on the results page
    // instead of the typing page.
    //
    // Gating on `raceStartedRef.current` — a fresh, per-mount ref that only
    // becomes true once THIS race's countdown has actually completed and
    // startTest() has been called for it — means this effect can only ever
    // fire for a genuine finish of the CURRENT race, never a stale leftover
    // from the one before it.
    if (phase === 'finished' && raceStartedRef.current && !finishSubmittedRef.current) {
      finishSubmittedRef.current = true;
      stopProgressReporting();
      submitFinalResult().then(() => navigate('/multiplayer/results'));
    }
  }, [phase, stopProgressReporting, submitFinalResult, navigate]);

  useEffect(() => {
    if (!room) navigate('/multiplayer');
  }, [room, navigate]);

  if (!room || !currentUser) return null;

  const activePlayers = room.players.filter((p) => !p.isSpectator);
  const selfPlayer = activePlayers.find((p) => p.userId === currentUser.id); // 🆕 Part 1
  const totalWords = words.length;

  // 🆕 Part 3.2/3.3 — rank derived fresh each render from live progress;
  // rankDelta compares against the previous render's rank per user, no new
  // server event needed. (Unchanged from before Part 5 — this only drives
  // the ▲/▼ arrows on the race-track bars, not the new leaderboard, which
  // has its own ranking rule — see RaceLeaderboard.tsx.)
  const ranked = activePlayers
    .map((p) => {
      const isSelf = p.userId === currentUser.id;
      const live = isSelf ? { wordIndex: currentWordIndex, wpm: localWpm } : otherPlayersProgress[p.userId];
      return { ...p, liveWordIndex: live?.wordIndex ?? 0, liveWpm: live?.wpm ?? 0 };
    })
    .sort((a, b) => b.liveWordIndex - a.liveWordIndex || b.liveWpm - a.liveWpm);
  const rankDeltas: Record<string, -1 | 0 | 1> = {};
  ranked.forEach((p, i) => {
    const prev = prevRankRef.current[p.userId];
    if (prev !== undefined && prev !== i) rankDeltas[p.userId] = prev > i ? 1 : -1;
    prevRankRef.current[p.userId] = i;
  });

  const showCountdown = countdown !== null && countdown > 0;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        <AnimatePresence mode="wait">
          {showCountdown ? (
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="text-7xl font-bold text-accent"
            >
              {countdown}
            </motion.div>
          ) : showGo ? (
            <motion.div
              key="go"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-7xl font-bold text-status-success"
            >
              GO
            </motion.div>
          ) : (
            <motion.div
              key="race"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl flex flex-col md:flex-row gap-4"
            >
              <div className="flex-1 flex flex-col gap-6">
                {/* 🆕 Part 10 — same HUD solo mode shows: countdown timer
                    (time mode) or word progress (words mode, Part 7) plus
                    live wpm/raw/accuracy, sourced straight from
                    useTypingStore.metrics like solo's TypingView does.
                    Rendered ABOVE the race-specific UI (leaderboard, peer
                    cursors), never replacing it. */}
                <div className="flex flex-col items-center">
                  {room.settings.mode === 'time' ? <Timer /> : <WordProgress />}
                  <LiveStats />
                </div>
                <div className="bg-bg-secondary border border-border rounded-xl p-4 flex flex-col gap-2">
                  {activePlayers.map((p) => {
                    const isSelf = p.userId === currentUser.id;
                    const live = isSelf
                      ? { wordIndex: currentWordIndex, wpm: localWpm }
                      : otherPlayersProgress[p.userId];
                    return (
                      <PlayerProgressBar
                        key={p.userId}
                        username={p.username}
                        avatarUrl={p.avatarUrl}
                        colorId={p.colorId}
                        isSelf={isSelf}
                        wordIndex={live?.wordIndex ?? 0}
                        totalWords={totalWords}
                        wpm={live?.wpm ?? 0}
                        connection={p.connection}
                        rankDelta={rankDeltas[p.userId] ?? 0}
                      />
                    );
                  })}
                </div>
                {/* 🆕 Part 1 — the --text-cursor override below repurposes
                    WordDisplay's own existing blinking caret as the spec's
                    "true local caret": white in dark mode, black in light
                    mode, still tracking actual typing position exactly as
                    before. WordDisplay.tsx itself is untouched by this. */}
                <div
                  className="relative"
                  ref={wordDisplayContainerRef}
                  style={{ '--text-cursor': theme === 'dark' ? '255 255 255' : '0 0 0' } as React.CSSProperties}
                >
                  <WordDisplay />
                  <PeerCursorOverlay
                    containerRef={wordDisplayContainerRef}
                    players={activePlayers}
                    selfUserId={currentUser.id}
                  />
                  {/* 🆕 Part 1 — local player's own frozen colored progress cursor */}
                  {selfPlayer && (
                    <SelfCursorOverlay containerRef={wordDisplayContainerRef} colorId={selfPlayer.colorId} />
                  )}
                </div>
              </div>
              {/* 🆕 Part 5 — full leaderboard overhaul (avatar/name/live
                  stats, per-player placement tagged the moment they finish).
                  Replaces the old compact "Standings" panel that lived
                  inline here. */}
              <RaceLeaderboard
                players={activePlayers}
                currentUserId={currentUser.id}
                localWordIndex={currentWordIndex}
                localWpm={localWpm}
                localAccuracy={localAccuracy}
                otherPlayersProgress={otherPlayersProgress}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default RacePage;
