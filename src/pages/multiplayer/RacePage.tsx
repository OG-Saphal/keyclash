import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
import PeerCursorOverlay from '../../components/multiplayer/PeerCursorOverlay'; // 🆕 Part 2
import SelfCursorOverlay from '../../components/multiplayer/SelfCursorOverlay'; // 🆕 Part 1
import RaceLeaderboard from '../../components/multiplayer/RaceLeaderboard'; // 🆕 Part 5 — now also absorbs PlayerProgressBar's job, see that file
import SpectatorsList from '../../components/multiplayer/SpectatorsList'; // ✨ Feature — spectator list
import CountdownOverlay from '../../components/multiplayer/CountdownOverlay'; // 🆕 redesign — full-viewport countdown/GO event

/**
 * Multiplayer race view. Reuses the EXISTING typing engine wholesale for the
 * local player — this component never reimplements typing logic, it only:
 *  1. Feeds server-generated race text into useTypingStore (loadExternalWords)
 *  2. Starts the test at the server's startTimestamp (synced countdown),
 *     not on the player's first keystroke
 *  3. Reports the local player's own progress to the server (throttled,
 *     via useMultiplayerStore.beginProgressReporting)
 *  4. Renders everyone else's progress as a live leaderboard of race lanes
 *     + a live cursor overlay, plus (Part 10) the same Timer/WordProgress +
 *     LiveStats HUD solo mode shows, and (Part 6) a drift-free server-synced
 *     match timer for time-mode races.
 *
 * 🆕 Layout redesign — this used to be a single centered column with the
 * leaderboard stacked awkwardly below the race-track bars. It's now a
 * focused single viewport: a ~70/30 asymmetric split with the word track as
 * the unambiguous focal point on the left and a persistent race-lane
 * sidebar on the right (collapsing to a stacked column below md). The
 * countdown/GO sequence is a full-screen takeover (CountdownOverlay) rather
 * than sharing space with the race UI underneath it. None of the state
 * machine below changed — only what gets rendered and where.
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

  // 🆕 Part 6 — server-synced match finish safety net (time mode only).
  //
  // useTimer() above still drives the engine's own 1-second tick() call —
  // that is LEFT COMPLETELY ALONE. tick() is also what triggers
  // finishTest() when time runs out, decrements `timeLeft` by 1 every real
  // second, and records the per-second wpmHistory graph point; all of that
  // is a real, shared engine responsibility this deliberately does not
  // duplicate or fork.
  //
  // 🐛 FIX (Bug #5 — "timer ticks incorrectly / counts down twice as
  // fast") — this effect used to ALSO overwrite `timeLeft` every 100ms
  // with a value derived straight from `raceStartTimestamp + duration`.
  // That's a second, independent mechanism racing against tick()'s own
  // relative `timeLeft - 1` decrement to be the one to cross each 1-second
  // boundary first. Whichever one lost the race then decremented from a
  // value the OTHER had already corrected down — e.g. this effect corrects
  // 30 -> 29 a few ms before tick()'s own 1-second interval fires, and
  // tick() then computes 29 - 1 = 28 for what should still have been the
  // "29" second. That's two separate "drop by 1" events landing in the
  // same real second, which is exactly the observed "29→28, 28→27, 27→26"
  // double-speed symptom. tick() (and only tick()) must own `timeLeft` —
  // solo mode already relies on this being true.
  //
  // This effect now ONLY acts as a safety net for a THROTTLED tab whose
  // own 1-second tick() interval might stall entirely (so tick() itself
  // might never notice zero): once the server-derived clock has actually
  // reached zero and the engine hasn't finished on its own yet, it calls
  // the engine's existing finishTest() action directly — but it no longer
  // touches `timeLeft` at all, so there is exactly one owner of that
  // value again, in both solo and multiplayer.
  useEffect(() => {
    if (!raceStartTimestamp || !room || room.settings.mode !== 'time') return;
    const syncInterval = setInterval(() => {
      if (useTypingStore.getState().phase !== 'running') return;
      const endsAt = raceStartTimestamp + room.settings.duration * 1000;
      const msLeft = endsAt - Date.now();
      if (msLeft <= 0 && !timeoutFinishRef.current) {
        timeoutFinishRef.current = true;
        useTypingStore.getState().finishTest();
      }
    }, 250);
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
    // 🐛 FIX (Bug #2 — "results shown before everyone finishes") — this
    // effect used to call navigate('/multiplayer/results') itself the
    // moment THIS client's own submitFinalResult() resolved, regardless of
    // whether any other active player was still racing. Submitting the
    // result the instant you finish is still correct (the server should
    // have your stats immediately), but the NAVIGATION now waits for the
    // server to confirm the ROOM itself has moved to status 'finished' —
    // i.e. every other non-abandoned active player has also finished or
    // been marked DNF (see roomManager.ts's finishRace(), which already
    // only flips room.status to 'finished' once that's true). That shared
    // status transition is exactly what RoomStatusRouter (App.tsx) already
    // reacts to identically for every client — the same pattern it already
    // uses for the 'waiting' -> lobby rematch transition — so this
    // component no longer navigates on its own.
    if (phase === 'finished' && raceStartedRef.current && !finishSubmittedRef.current) {
      finishSubmittedRef.current = true;
      stopProgressReporting();
      submitFinalResult();
    }
  }, [phase, stopProgressReporting, submitFinalResult]);

  useEffect(() => {
    if (!room) navigate('/multiplayer');
  }, [room, navigate]);

  if (!room || !currentUser) return null;

  const activePlayers = room.players.filter((p) => !p.isSpectator);
  const spectators = room.players.filter((p) => p.isSpectator); // ✨ Feature — spectator list
  const selfPlayer = activePlayers.find((p) => p.userId === currentUser.id); // 🆕 Part 1
  const totalWords = words.length;

  // 🆕 Part 3.2/3.3 — rank derived fresh each render from live progress;
  // rankDelta compares against the previous render's rank per user, no new
  // server event needed. Still drives the ▲/▼ arrows, now rendered inside
  // RaceLeaderboard's lanes instead of a separate PlayerProgressBar.
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
  // 🆕 Bug #2 UX — shown once this client has finished but the room hasn't
  // moved to 'finished' yet (other active players still racing/DNF-ing).
  const waitingForOthers = phase === 'finished' && raceStartedRef.current && room.status !== 'finished';

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">
      {/* 🆕 ambient mesh gradient — sits behind everything, drifts very
          slowly so it never competes with the race itself for attention. */}
      <div className="pointer-events-none absolute inset-0 bg-mesh-race animate-meshDrift" />

      <div className="relative z-10 flex flex-col flex-1">
        <Header />

        <CountdownOverlay countdown={showCountdown ? countdown : null} showGo={showGo} />

        <main className="flex-1 flex items-center justify-center px-4 py-4 md:py-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-6xl flex flex-col md:flex-row gap-4 md:gap-5"
          >
            {/* Primary column (~70%) — dashboard + track */}
            <div className="flex-1 md:basis-[70%] flex flex-col gap-4 min-w-0">
              {waitingForOthers && (
                <div className="text-center text-sm text-text-secondary bg-white/5 backdrop-blur-sm border border-border rounded-xl py-2 px-4">
                  You finished! Waiting for the other racers to finish…
                </div>
              )}

              {/* 🆕 Part 10 redesign — "digital dashboard" HUD: timer (or
                  word progress) + live stats rendered as one glass
                  instrument cluster, centered above the track. */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {room.settings.mode === 'time' ? <Timer /> : <WordProgress />}
                <LiveStats />
              </div>

              {/* 🆕 Part 1 — the --text-cursor override below repurposes
                  WordDisplay's own existing blinking caret as the spec's
                  "true local caret": white in dark mode, black in light
                  mode, still tracking actual typing position exactly as
                  before.
                  🐛 FIX (raw/synced caret double-up) — WordDisplay now
                  also takes `hideCaretWhenSynced`, which suppresses its
                  raw caret whenever it would land at the exact same
                  position as SelfCursorOverlay's frozen cursor below (no
                  uncorrected mistake in the current word). Solo mode
                  never passes this prop, so its caret behavior is
                  unaffected. */}
              <div
                className="relative"
                ref={wordDisplayContainerRef}
                style={{ '--text-cursor': theme === 'dark' ? '255 255 255' : '0 0 0' } as React.CSSProperties}
              >
                <WordDisplay hideCaretWhenSynced />
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

            {/* Secondary column (~30%) — persistent race-lane sidebar.
                🆕 Part 5 redesign — the leaderboard now IS the per-player
                progress bars (see RaceLeaderboard.tsx), so there's a single
                sidebar panel instead of a bars-block + a separate
                standings panel. */}
            <div className="md:basis-[30%] flex flex-col gap-3 md:sticky md:top-4 md:self-start">
              <RaceLeaderboard
                players={activePlayers}
                currentUserId={currentUser.id}
                localWordIndex={currentWordIndex}
                localWpm={localWpm}
                localAccuracy={localAccuracy}
                otherPlayersProgress={otherPlayersProgress}
                totalWords={totalWords}
                rankDeltas={rankDeltas}
              />
              {/* ✨ Feature — spectators watching the race, real-time via
                  the same room:updated broadcasts the leaderboard uses. */}
              <SpectatorsList spectators={spectators} variant="inline" />
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default RacePage;
